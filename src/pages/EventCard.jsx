import { useState, useEffect } from "react";
import { CreditCard, List, Settings } from "lucide-react";
import { CardView } from "./CardView";
import { ListView } from "./ListView";
import { PreferencesPanel } from "./PreferencesPanel";
import { motion, AnimatePresence } from "framer-motion";
import { db, auth } from "../firebaseConfig";
import {
	collection,
	query,
	where,
	getDocs,
	doc,
	getDoc,
	setDoc,
	updateDoc,
	arrayUnion,
	arrayRemove,
} from "firebase/firestore";

export default function EventCard() {
	const [eventView, setEventView] = useState("card");
	const [showPreferences, setShowPreferences] = useState(false);
	const [currentEventIndex, setCurrentEventIndex] = useState(0);
	const [direction, setDirection] = useState(0);
	const [selectedEventId, setSelectedEventId] = useState(null);
	const [events, setEvents] = useState([]);
	const [myEvents, setMyEvents] = useState([]);
	const [likedEvents, setLikedEvents] = useState([]);
	const [bannedEvents, setBannedEvents] = useState([]);
	const [showCongratulations, setShowCongratulations] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [userData, setUserData] = useState(null);

	useEffect(() => {
		const loadUserDataAndEvents = async () => {
			setIsLoading(true);
			setError(null);
			try {
				await fetchUserData();
			} catch (err) {
				console.error("Error loading user data:", err);
				setError(
					"Wystąpił błąd podczas ładowania danych użytkownika. Proszę odświeżyć stronę."
				);
			} finally {
				setIsLoading(false);
			}
		};

		loadUserDataAndEvents();
	}, []);

	useEffect(() => {
		if (userData) {
			fetchEvents();
		}
	}, [userData]);

	const fetchUserData = async () => {
		const user = auth.currentUser;
		if (!user) {
			throw new Error("Użytkownik nie jest zalogowany");
		}

		const usersRef = collection(db, "users");
		const q = query(usersRef, where("uid", "==", user.uid));
		const querySnapshot = await getDocs(q);

		if (querySnapshot.empty) {
			throw new Error("Nie znaleziono danych użytkownika");
		}

		const userData = querySnapshot.docs[0].data();
		setUserData(userData);
	};

	const fetchEvents = async () => {
		setIsLoading(true);
		setError(null);
		try {
			const user = auth.currentUser;
			if (!user) {
				return;
			}

			const userEventsDoc = await getDoc(doc(db, "myevents", user.uid));
			const userEventsData = userEventsDoc.data() || {};
			const joinedEvents = userEventsData.joined || [];
			const likedEvents = userEventsData.liked || [];
			const bannedEvents = userEventsData.banned || [];

			setMyEvents(joinedEvents);
			setLikedEvents(likedEvents);
			setBannedEvents(bannedEvents);

			const eventsRef = collection(db, "events");
			const excludedEvents = [
				...joinedEvents,
				...likedEvents,
				...bannedEvents,
			];

			const querySnapshot = await getDocs(query(eventsRef));

			const fetchedEvents = await Promise.all(
				querySnapshot.docs.map(async (doc) => {
					const eventData = doc.data();

					if (
						eventData.creator === user.uid ||
						excludedEvents.includes(doc.id)
					) {
						return null;
					}

					if (
						eventData.capacity !== -1 &&
						eventData.participants.length >= eventData.capacity
					) {
						return null;
					}

					// Apply filters based on user preferences and event requirements
					if (
						userData.preferences.meetRequirements &&
						eventData.requirements &&
						!eventData.requirements.none
					) {
						// Age requirement
						if (eventData.requirements.age && userData.age) {
							const [minAge, maxAge] = eventData.requirements.age
								.split("-")
								.map(Number);
							if (
								userData.age < minAge ||
								userData.age > maxAge
							) {
								return null;
							}
						}

						// Gender requirement
						if (
							eventData.requirements.gender &&
							userData.gender &&
							eventData.requirements.gender !== userData.gender
						) {
							return null;
						}

						// Location requirement
						if (
							eventData.requirements.location &&
							userData.city &&
							eventData.requirements.location !== userData.city
						) {
							return null;
						}
					}

					// Filter by location preference
					// if (
					// 	userData.preferences.location &&
					// 	eventData.city !== userData.preferences.location
					// ) {
					// 	return null;
					// }

					// Filter by person limit
					if (userData.preferences.usePersonLimit) {
						if (eventData.capacity === -1) {
							//
						} else if (
							eventData.capacity >
							userData.preferences.personLimit
						) {
							return null;
						}
					}

					// Filter by interests
					if (
						userData.preferences.interests &&
						userData.preferences.interests.length > 0 &&
						eventData.interests
					) {
						if (
							!eventData.interests.some((interest) =>
								userData.preferences.interests.includes(
									interest
								)
							)
						) {
							return null;
						}
					}

					// Fetch creator name
					const creatorQuery = query(
						collection(db, "users"),
						where("uid", "==", eventData.creator)
					);
					const creatorSnapshot = await getDocs(creatorQuery);
					const creatorName = !creatorSnapshot.empty
						? creatorSnapshot.docs[0].data().name
						: "Nieznany";

					// Fetch participant images
					const participantImages = await Promise.all(
						eventData.participants.map(async (uid) => {
							const participantQuery = query(
								collection(db, "users"),
								where("uid", "==", uid)
							);
							const participantSnapshot = await getDocs(
								participantQuery
							);
							return !participantSnapshot.empty
								? participantSnapshot.docs[0].data()
										.profileImage
								: null;
						})
					);

					return {
						id: doc.id,
						...eventData,
						creatorName,
						participantImages: participantImages.filter(Boolean),
					};
				})
			);

			const filteredEvents = fetchedEvents.filter(Boolean);
			setEvents(filteredEvents);
		} catch (err) {
			console.error("Error fetching events:", err);
			setError(
				"Wystąpił błąd podczas ładowania wydarzeń. Proszę odświeżyć stronę."
			);
		} finally {
			setIsLoading(false);
		}
	};

	const updateUserEvents = async (eventId, field) => {
		const user = auth.currentUser;
		if (!user) return;

		const userEventsRef = doc(db, "myevents", user.uid);
		const userEventsDoc = await getDoc(userEventsRef);

		if (userEventsDoc.exists()) {
			await updateDoc(userEventsRef, {
				[field]: arrayUnion(eventId),
			});
		} else {
			await setDoc(userEventsRef, {
				[field]: [eventId],
			});
		}

		await fetchEvents();
	};

	const handleJoinEvent = async (eventId) => {
		const user = auth.currentUser;
		if (!user) return;

		try {
			// Check if the event is still available
			const eventRef = doc(db, "events", eventId);
			const eventDoc = await getDoc(eventRef);
			const eventData = eventDoc.data();

			if (
				eventData.capacity !== -1 &&
				eventData.participants.length >= eventData.capacity
			) {
				alert("Przepraszamy, to wydarzenie jest już pełne.");
				await fetchEvents();
				return;
			}

			// Update user's events
			await updateUserEvents(eventId, "joined");

			// Update event's participants
			await updateDoc(eventRef, {
				participants: arrayUnion(user.uid),
			});

			// Update chat participants
			const usersRef = collection(db, "users");
			const userQuery = query(usersRef, where("uid", "==", user.uid));
			const userDocs = await getDocs(userQuery);

			if (!userDocs.empty) {
				const userDoc = userDocs.docs[0];
				const userData = userDoc.data();
				const participantData = {
					id: user.uid,
					name: userData.name,
					profileImage: userData.profileImage,
				};

				const chatRef = doc(db, "chats", eventId);
				await updateDoc(chatRef, {
					participants: arrayUnion(participantData),
				});
			}

			setShowCongratulations(true);
			setSelectedEventId(null);
			await fetchEvents();
		} catch (err) {
			console.error("Error joining event:", err);
		}
	};

	const handleLikeEvent = async (eventId) => {
		await updateUserEvents(eventId, "liked");
		if (eventView === "card") {
			nextEvent();
		} else {
			closeCardView();
		}
	};

	const handleDislikeEvent = async (eventId) => {
		await updateUserEvents(eventId, "banned");

		const eventRef = doc(db, "events", eventId);
		await updateDoc(eventRef, {
			participants: arrayRemove(auth.currentUser.uid),
		});

		const chatRef = doc(db, "chats", eventId);
		await updateDoc(chatRef, {
			participants: arrayRemove(auth.currentUser.uid),
		});

		if (eventView === "card") {
			nextEvent();
		} else {
			closeCardView();
		}
	};

	const nextEvent = () => {
		if (events.length === 0) return;
		setDirection(1);
		setCurrentEventIndex((prevIndex) => (prevIndex + 1) % events.length);
	};

	const handleSwipe = (swipeDirection) => {
		if (swipeDirection > 0) {
			nextEvent();
		}
	};

	const handleSelectEvent = (eventId) => {
		setSelectedEventId(eventId);
		const selectedIndex = events.findIndex((event) => event.id === eventId);
		setCurrentEventIndex(selectedIndex);
	};

	const closeCardView = () => {
		setSelectedEventId(null);
	};

	const handleEventViewChange = (newView) => {
		setEventView(newView);
		setSelectedEventId(null);
	};

	const handleCloseCongratulations = () => {
		setShowCongratulations(false);
	};

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center bg-gray-100">
				<p className="text-xl text-gray-600">Ładowanie...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="h-full flex items-center justify-center bg-gray-100">
				<p className="text-xl text-red-600">{error}</p>
			</div>
		);
	}

	return (
		<div className="h-full bg-gray-100 flex flex-col">
			<div className="bg-white shadow z-10">
				<div className="container mx-auto px-4 py-2 flex items-center justify-between h-14">
					<div className="flex-1"></div>
					<div className="flex items-center space-x-4">
						<button
							className={`flex items-center space-x-1 p-2 ${
								eventView === "card" ? "bg-gray-200" : ""
							} rounded-md`}
							onClick={() => handleEventViewChange("card")}
						>
							<CreditCard className="w-5 h-5" />
							<span className="text-sm">Widok Karty</span>
						</button>
						<button
							className={`flex items-center space-x-1 p-2 ${
								eventView === "list" ? "bg-gray-200" : ""
							} rounded-md`}
							onClick={() => handleEventViewChange("list")}
						>
							<span className="text-sm">Widok Listy</span>
							<List className="w-5 h-5" />
						</button>
					</div>
					<div className="flex-1 flex justify-end">
						<button
							onClick={() => setShowPreferences(!showPreferences)}
						>
							<Settings className="w-6 h-6" />
						</button>
					</div>
				</div>
			</div>

			<div className="flex-grow overflow-hidden relative">
				{eventView === "card" && !selectedEventId && (
					<AnimatePresence initial={false} custom={direction}>
						{events.length > 0 ? (
							<motion.div
								key={currentEventIndex}
								custom={direction}
								initial={{
									opacity: 0,
									x: direction > 0 ? 300 : -300,
								}}
								animate={{ opacity: 1, x: 0 }}
								exit={{
									opacity: 0,
									x: direction < 0 ? 300 : -300,
								}}
								transition={{
									type: "spring",
									stiffness: 300,
									damping: 30,
								}}
								className="h-full"
							>
								<CardView
									event={events[currentEventIndex]}
									onSwipe={handleSwipe}
									nextEvent={nextEvent}
									showCloseButton={false}
									showNextButton={true}
									onJoin={handleJoinEvent}
									onLike={handleLikeEvent}
									onDislike={handleDislikeEvent}
								/>
							</motion.div>
						) : (
							<div className="h-full flex items-center justify-center">
								<p className="text-xl text-gray-600 text-center px-4">
									Niestety nie mamy dla Ciebie żadnych
									wydarzeń :(
								</p>
							</div>
						)}
					</AnimatePresence>
				)}
				{eventView === "list" && !selectedEventId && (
					<div className="h-full">
						<ListView
							events={events}
							onSelectEvent={handleSelectEvent}
						/>
					</div>
				)}
				<AnimatePresence>
					{selectedEventId && (
						<motion.div
							initial={{ y: "100%" }}
							animate={{ y: 0 }}
							exit={{ y: "100%" }}
							transition={{
								type: "spring",
								damping: 25,
								stiffness: 500,
							}}
							className="absolute inset-0 bg-gray-100"
						>
							<CardView
								event={events.find(
									(event) => event.id === selectedEventId
								)}
								onSwipe={handleSwipe}
								nextEvent={nextEvent}
								onClose={closeCardView}
								showCloseButton={true}
								showNextButton={false}
								onJoin={handleJoinEvent}
								onLike={handleLikeEvent}
								onDislike={handleDislikeEvent}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{showPreferences && (
				<PreferencesPanel
					onClose={() => setShowPreferences(false)}
					userPreferences={userData.preferences}
					setUserPreferences={(newPreferences) => {
						setUserData((prevData) => ({
							...prevData,
							preferences: newPreferences,
						}));
					}}
				/>
			)}
			{showCongratulations && (
				<div
					className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50"
					onClick={handleCloseCongratulations}
				>
					<div
						className="bg-white p-8 rounded-lg shadow-xl text-center"
						onClick={(e) => e.stopPropagation()}
					>
						<h2 className="text-2xl font-bold mb-4 text-green-500">
							Gratulacje!
						</h2>
						<p className="text-lg">Dołączyłeś do wydarzenia.</p>
					</div>
				</div>
			)}
		</div>
	);
}
