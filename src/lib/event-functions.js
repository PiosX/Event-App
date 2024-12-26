import {
	format,
	parseISO,
	differenceInMilliseconds,
	differenceInHours,
	isWithinInterval,
} from "date-fns";
import {
	collection,
	query,
	where,
	getDocs,
	doc,
	updateDoc,
	arrayUnion,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Radius of the Earth in km
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLon = ((lon2 - lon1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c; // Distance in km
	return distance;
}

export const getUserLocation = async () => {
	if ("geolocation" in navigator) {
		return new Promise((resolve) => {
			navigator.geolocation.getCurrentPosition(
				async (position) => {
					const { latitude, longitude } = position.coords;
					try {
						const response = await fetch(
							`https://us1.locationiq.com/v1/reverse.php?key=${
								import.meta.env.VITE_LOCATIONIQ_TOKEN
							}&lat=${latitude}&lon=${longitude}&format=json`
						);
						const data = await response.json();
						const city =
							data.address.city ||
							data.address.town ||
							data.address.village ||
							"";
						const street = data.address.road || "";
						resolve({
							city,
							street,
							lat: latitude,
							lng: longitude,
						});
					} catch (error) {
						console.error("Error fetching location:", error);
						resolve(null);
					}
				},
				(error) => {
					console.error("Error getting user location:", error);
					resolve(null);
				}
			);
		});
	}
	return null;
};

export async function getCoordinates(addresses) {
	const results = {};

	for (const address of addresses) {
		try {
			const response = await fetch(
				`https://us1.locationiq.com/v1/search.php?key=${
					import.meta.env.VITE_LOCATIONIQ_TOKEN
				}&q=${encodeURIComponent(address)}&format=json`
			);

			if (!response.ok) {
				throw new Error("Network response was not ok");
			}

			const data = await response.json();
			if (data && data.length > 0) {
				const coordinates = {
					lat: parseFloat(data[0].lat),
					lng: parseFloat(data[0].lon),
				};
				results[address] = coordinates; // Zapisz współrzędne
			} else {
				console.warn(`No results for address: ${address}`);
			}
		} catch (error) {
			console.error(`Error fetching coordinates for ${address}:`, error);
		}
	}

	return results;
}

export function eventMeetsUserPreferences(eventData, userPreferences, user) {
	if (
		userPreferences.meetRequirements &&
		eventData.requirements &&
		!eventData.requirements.none
	) {
		// Age requirement
		if (eventData.requirements.age && user.age) {
			const [minAge, maxAge] = eventData.requirements.age
				.split("-")
				.map(Number);
			if (user.age < minAge || user.age > maxAge) {
				return false;
			}
		}

		// Gender requirement
		if (
			eventData.requirements.gender &&
			user.gender &&
			eventData.requirements.gender !== user.gender
		) {
			return false;
		}

		// Location requirement
		if (
			eventData.requirements.location &&
			user.location &&
			eventData.requirements.location !== user.location
		) {
			return false;
		}
	}

	// Interests
	if (
		userPreferences.interests &&
		userPreferences.interests.length > 0 &&
		eventData.selectedCategories
	) {
		if (
			!eventData.selectedCategories.some((interest) =>
				userPreferences.interests.includes(interest)
			)
		) {
			return false;
		}
	}

	return true;
}

export function eventMeetsDateCriteria(eventData, userPreferences) {
	if (!userPreferences.searchByDate) {
		return true; // If not searching by date, all events meet criteria
	}

	const eventDate = parseISO(eventData.date);
	const startDate = parseISO(userPreferences.startDate);
	const endDate = parseISO(userPreferences.endDate);

	return isWithinInterval(eventDate, { start: startDate, end: endDate });
}

export function eventMeetsPersonLimitCriteria(eventData, userPreferences) {
	if (!userPreferences.usePersonLimit) {
		return true; // If not using person limit, all events meet criteria
	}

	if (eventData.capacity === -1) {
		return false; // Exclude events with no limit if user wants a limit
	}

	return eventData.capacity <= userPreferences.personLimit;
}

export async function calculateEventDistance(
	eventData,
	userLocation,
	coordinates
) {
	if (!userLocation || !coordinates) return null;

	// Stwórz adres na podstawie eventData
	const address = `${eventData.street}, ${eventData.city}`;
	// Pobierz współrzędne wydarzenia z coordinates
	const eventLocation = coordinates[address];

	if (!eventLocation) return null; // Jeśli nie znaleziono współrzędnych, zwróć null

	// Wydobądź współrzędne użytkownika
	const userCity = Object.keys(userLocation)[0]; // Załóżmy, że użytkownik jest w pierwszym mieście, które znajdziesz
	const userCoordinates = userLocation[userCity]; // Przypisz odpowiednie współrzędne użytkownika
	if (!userCoordinates) return null; // Jeśli nie znaleziono współrzędnych użytkownika, zwróć null

	// Oblicz dystans
	const distance = calculateDistance(
		userCoordinates.lat,
		userCoordinates.lng,
		eventLocation.lat,
		eventLocation.lng
	);

	return distance; // Zwróć obliczony dystans
}

export async function fetchCreatorName(creatorId) {
	const creatorQuery = query(
		collection(db, "users"),
		where("uid", "==", creatorId)
	);
	const creatorSnapshot = await getDocs(creatorQuery);
	return !creatorSnapshot.empty
		? creatorSnapshot.docs[0].data().name
		: "Nieznany";
}

export async function fetchParticipantImages(participantIds) {
	return await Promise.all(
		participantIds.map(async (uid) => {
			const participantQuery = query(
				collection(db, "users"),
				where("uid", "==", uid)
			);
			const participantSnapshot = await getDocs(participantQuery);
			return !participantSnapshot.empty
				? participantSnapshot.docs[0].data().profileImage
				: null;
		})
	);
}

export async function updateChatParticipants(eventId, userId) {
	const usersRef = collection(db, "users");
	const userQuery = query(usersRef, where("uid", "==", userId));
	const userDocs = await getDocs(userQuery);

	if (!userDocs.empty) {
		const userDoc = userDocs.docs[0];
		const userData = userDoc.data();
		const participantData = {
			id: userId,
			name: userData.name,
			profileImage: userData.profileImage,
		};

		const chatRef = doc(db, "chats", eventId);
		await updateDoc(chatRef, {
			participants: arrayUnion(participantData),
		});
	}
}

export const calculateTimeLeft = (eventDate, allowLateJoin, lateJoinDate) => {
	const now = new Date();
	const localEventDate = new Date(eventDate).toLocaleString("en-US", {
		timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	});
	const localLateJoinDate = lateJoinDate
		? new Date(lateJoinDate).toLocaleString("en-US", {
				timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		  })
		: null;

	const eventDateTime = new Date(localEventDate);
	const lateJoinDateTime = localLateJoinDate
		? new Date(localLateJoinDate)
		: null;

	if (now < eventDateTime) {
		const difference = eventDateTime - now;
		return {
			difference,
			status: "upcoming",
		};
	} else if (allowLateJoin && lateJoinDateTime && now < lateJoinDateTime) {
		const difference = lateJoinDateTime - now;
		return {
			difference,
			status: "ongoing",
		};
	}

	return { status: "ended" };
};

export const getTimeLeftColor = (timeLeft) => {
	if (!timeLeft) return "bg-red-500";
	if (timeLeft.status === "ended") return "bg-red-500";
	if (timeLeft.status === "ongoing") return "bg-green-500";
	if (timeLeft.difference > 172800000) return "bg-gray-200"; // More than 2 days
	if (timeLeft.difference > 86400000) return "bg-yellow-200"; // Between 1 and 2 days
	return "bg-green-200"; // Less than 1 day
};

export const formatTimeLeft = (timeLeft) => {
	if (!timeLeft || timeLeft.status === "ended") return "Zakończone";

	const formatNumber = (num) => num.toString().padStart(2, "0");
	const days = Math.floor(timeLeft.difference / (1000 * 60 * 60 * 24));
	const hours = Math.floor(
		(timeLeft.difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
	);
	const minutes = Math.floor(
		(timeLeft.difference % (1000 * 60 * 60)) / (1000 * 60)
	);
	const seconds = Math.floor((timeLeft.difference % (1000 * 60)) / 1000);

	if (timeLeft.status === "ongoing") {
		return `Koniec za: ${formatNumber(hours)}:${formatNumber(
			minutes
		)}:${formatNumber(seconds)}`;
	}

	if (days > 0) {
		return `Do startu: ${days} ${days === 1 ? "dzień" : "dni"}`;
	}
	return `Do startu: ${formatNumber(hours)}:${formatNumber(
		minutes
	)}:${formatNumber(seconds)}`;
};

function formatDuration(duration) {
	if (duration.days > 0)
		return `${duration.days} ${duration.days === 1 ? "dzień" : "dni"}`;
	return `${String(duration.hours).padStart(2, "0")}:${String(
		duration.minutes
	).padStart(2, "0")}:${String(duration.seconds).padStart(2, "0")}`;
}

export const getCurrentTime = () => {
	const now = new Date();
	const minutes = now.getMinutes();

	const roundedMinutes = Math.round(minutes / 10) * 10;

	now.setMinutes(roundedMinutes);
	now.setSeconds(0);
	now.setMilliseconds(0);

	now.setHours(now.getHours() + 1);

	return format(now, "HH:mm");
};

export const calculateEventDuration = (startDate, endDate) => {
	const start = parseISO(startDate);
	const end = parseISO(endDate);
	return differenceInHours(end, start);
};

export const getHourWord = (hours) => {
	if (hours === 1) return "godzina";
	if (hours >= 2 && hours <= 4) return "godziny";
	return "godzin";
};
