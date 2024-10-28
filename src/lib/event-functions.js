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

export function eventMeetsUserPreferences(eventData, userPreferences) {
	if (
		userPreferences.meetRequirements &&
		eventData.requirements &&
		!eventData.requirements.none
	) {
		// Age requirement
		if (eventData.requirements.age && userPreferences.age) {
			const [minAge, maxAge] = eventData.requirements.age
				.split("-")
				.map(Number);
			if (userPreferences.age < minAge || userPreferences.age > maxAge) {
				return false;
			}
		}

		// Gender requirement
		if (
			eventData.requirements.gender &&
			userPreferences.gender &&
			eventData.requirements.gender !== userPreferences.gender
		) {
			return false;
		}

		// Location requirement
		if (
			eventData.requirements.location &&
			userPreferences.location &&
			eventData.requirements.location !== userPreferences.location
		) {
			return false;
		}
	}

	// Person limit
	if (
		userPreferences.usePersonLimit &&
		eventData.capacity !== -1 &&
		eventData.capacity > userPreferences.personLimit
	) {
		return false;
	}

	// Interests
	if (
		userPreferences.interests &&
		userPreferences.interests.length > 0 &&
		eventData.interests
	) {
		if (
			!eventData.interests.some((interest) =>
				userPreferences.interests.includes(interest)
			)
		) {
			return false;
		}
	}

	return true;
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
