import { useState, useEffect, useCallback, useRef } from "react";
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
import { Button } from "@/components/ui/button";
import {
	eventMeetsUserPreferences,
	fetchCreatorName,
	fetchParticipantImages,
	updateChatParticipants,
	calculateDistance,
	getCoordinates,
} from "@/lib/event-functions";
import Lottie from "lottie-react";
import animationNotFound from "../assets/animation-notFound.json";
import animationCreatedEvent from "../assets/animation-createdEvent.json";

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
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [userData, setUserData] = useState(null);
	const [showNotification, setShowNotification] = useState(false);
	const [notificationEventName, setNotificationEventName] = useState("");

	const fetchUserData = useCallback(async () => {
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
	}, []);

	const fetchEvents = useCallback(async () => {
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
			const querySnapshot = await getDocs(query(eventsRef));

			const fetchedEvents = [];
			const events = querySnapshot.docs
				.map((doc) => {
					const eventData = doc.data();
					if (
						eventData.creator === user.uid ||
						[
							...joinedEvents,
							...likedEvents,
							...bannedEvents,
						].includes(doc.id) ||
						(eventData.capacity !== -1 &&
							eventData.participants.length >= eventData.capacity)
					) {
						return null; // Skip this event
					}

					return { id: doc.id, ...eventData }; // Store event data
				})
				.filter(Boolean); // Filter out skipped events

			let userLat, userLng;

			if (
				userData.preferences.location &&
				userData.preferences.location !== ""
			) {
				const coordinates = await getCoordinates([
					userData.preferences.location,
				]);
				if (coordinates && coordinates[userData.preferences.location]) {
					userLat = coordinates[userData.preferences.location].lat;
					userLng = coordinates[userData.preferences.location].lng;
				} else {
					userLat = userData.lat;
					userLng = userData.lng;
				}
			} else {
				userLat = userData.lat;
				userLng = userData.lng;
			}

			const radius = userData.preferences.distance || 10;

			for (const eventData of events) {
				if (!eventData.lat || !eventData.lng) continue; // Skip if event doesn't have coordinates

				const distance = calculateDistance(
					userLat,
					userLng,
					eventData.lat,
					eventData.lng
				);

				if (distance === null || distance > radius) continue; // Skip if no distance or out of radius

				if (!eventMeetsUserPreferences(eventData, userData.preferences))
					continue; // Skip if event doesn't meet user preferences

				if (userData.preferences.searchByDate) {
					const eventDate = new Date(eventData.date);
					const startDate = userData.preferences.startDate
						? new Date(userData.preferences.startDate)
						: null;
					const endDate = userData.preferences.endDate
						? new Date(userData.preferences.endDate)
						: null;

					if (startDate && eventDate < startDate) continue;
					if (endDate && eventDate > endDate) continue;
				}

				const creatorName = await fetchCreatorName(eventData.creator);
				const participantImages = await fetchParticipantImages(
					eventData.participants
				);

				fetchedEvents.push({
					...eventData,
					creatorName,
					distance,
					participantImages: participantImages.filter(Boolean),
				});
			}

			setEvents(fetchedEvents);
		} catch (err) {
			console.error("Error fetching events:", err);
			setError(
				"Wystąpił błąd podczas ładowania wydarzeń. Proszę odświeżyć stronę."
			);
		} finally {
			setIsLoading(false);
		}
	}, [userData]);

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
	}, [fetchUserData]);

	useEffect(() => {
		if (userData) {
			fetchEvents();
		}
	}, [userData, fetchEvents]);

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

			await updateUserEvents(eventId, "joined");
			await updateDoc(eventRef, {
				participants: arrayUnion(user.uid),
			});

			await updateChatParticipants(eventId, user.uid);

			setNotificationEventName(eventData.eventName);
			setShowNotification(true);
			setTimeout(() => {
				setShowNotification(false);
				nextEvent();
			}, 2000);
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
		await updateDoc(doc(db, "events", eventId), {
			participants: arrayRemove(auth.currentUser.uid),
		});
		await updateDoc(doc(db, "chats", eventId), {
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
			<AnimatePresence>
				{showNotification && (
					<motion.div
						initial={{ y: -100, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: -100, opacity: 0 }}
						transition={{
							type: "spring",
							stiffness: 100,
							damping: 10,
						}}
						className="fixed top-0 left-0 right-0 z-50 w-full"
					>
						<div className="bg-white shadow-lg rounded-lg p-4 m-4 flex items-center space-x-4">
							<div className="w-16 h-16">
								<Lottie
									animationData={animationCreatedEvent}
									loop={true}
									autoplay={true}
								/>
							</div>
							<div>
								<h3 className="text-lg font-bold">
									Gratulacje!
								</h3>
								<p className="text-sm">
									Dołączyłeś do: {notificationEventName}
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<div className="bg-white shadow z-10">
				<div className="container mx-auto px-4 py-2 flex items-center justify-between h-14">
					<div className="flex-1"></div>
					<div className="flex items-center space-x-4">
						<Button
							variant={eventView === "card" ? "default" : "ghost"}
							onClick={() => handleEventViewChange("card")}
							className="flex items-center space-x-1"
						>
							<CreditCard className="w-5 h-5" />
							<span className="text-sm">Widok Karty</span>
						</Button>
						<Button
							variant={eventView === "list" ? "default" : "ghost"}
							onClick={() => handleEventViewChange("list")}
							className="flex items-center space-x-1"
						>
							<List className="w-5 h-5" />
							<span className="text-sm">Widok Listy</span>
						</Button>
					</div>
					<div className="flex-1 flex justify-end">
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setShowPreferences(!showPreferences)}
						>
							<Settings className="w-5 h-5" />
						</Button>
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
							<div className="h-full flex flex-col items-center justify-center">
								<Lottie
									animationData={animationNotFound}
									loop={true}
									autoplay={true}
									style={{ width: 200, height: 200 }}
								/>
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
		</div>
	);
}
