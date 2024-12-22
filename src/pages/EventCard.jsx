"use client";

import { useState, useEffect, useCallback } from "react";
import { CreditCard, List, Settings, FrownIcon, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Lottie from "lottie-react";
import animationNotFound from "../assets/animation-notFound.json";
import animationCreatedEvent from "../assets/animation-createdEvent.json";
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
	limit,
	startAfter,
	increment,
} from "firebase/firestore";
import {
	eventMeetsUserPreferences,
	fetchCreatorName,
	fetchParticipantImages,
	updateChatParticipants,
	calculateDistance,
	getCoordinates,
	calculateTimeLeft,
	getTimeLeftColor,
} from "@/lib/event-functions";
import EventCardStack from "@/components/ui/CardStack";
import { CardView } from "./CardView";
import { ListView } from "./ListView";
import { PreferencesPanel } from "./PreferencesPanel";

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
	const [notificationType, setNotificationType] = useState("success");

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

	const fetchEvents = useCallback(
		async (lastEventDate = null) => {
			setIsLoading(true);
			setError(null);

			try {
				const user = auth.currentUser;
				if (!user) {
					return [];
				}

				// Pobierz dane użytkownika
				const userEventsDoc = await getDoc(
					doc(db, "myevents", user.uid)
				);
				const userEventsData = userEventsDoc.data() || {};

				const joinedEvents = userEventsData.joined || [];
				const likedEvents = userEventsData.liked || [];
				const bannedEvents = userEventsData.banned || [];

				setMyEvents(joinedEvents);
				setLikedEvents(likedEvents);
				setBannedEvents(bannedEvents);

				const excludedEventIds = [
					...joinedEvents,
					...likedEvents,
					...bannedEvents,
				];

				const eventsRef = collection(db, "events");
				let finalEvents = [];
				let lastVisible = lastEventDate;
				const limitPerPage = 10;
				const totalLimit = 15;

				// Pobieraj wydarzenia, aż znajdziesz 15 lub skończą się wydarzenia w bazie
				while (finalEvents.length < totalLimit) {
					let q = query(
						eventsRef,
						where("date", ">=", new Date().toISOString())
					);

					if (lastVisible) {
						q = query(q, startAfter(lastVisible));
					}

					q = query(q, limit(limitPerPage));

					const querySnapshot = await getDocs(q);

					if (querySnapshot.empty) {
						break;
					}

					lastVisible =
						querySnapshot.docs[querySnapshot.docs.length - 1];

					const allEvents = querySnapshot.docs.map((doc) => ({
						id: doc.id,
						...doc.data(),
					}));

					// filtracja wydarzeń
					const filteredEvents = allEvents.filter(
						(eventData) =>
							!excludedEventIds.includes(eventData.id) &&
							eventData.creator !== user.uid &&
							(eventData.capacity === -1 ||
								eventData.participants.length <
									eventData.capacity)
					);

					// Preferencje
					let userLat = userData.lat;
					let userLng = userData.lng;

					if (userData.preferences.location) {
						const coordinates = await getCoordinates([
							userData.preferences.location,
						]);
						if (coordinates[userData.preferences.location]) {
							userLat =
								coordinates[userData.preferences.location].lat;
							userLng =
								coordinates[userData.preferences.location].lng;
						}
					}

					const radius = userData.preferences.distance || 10;

					for (const eventData of filteredEvents) {
						if (!eventData.lat || !eventData.lng) continue;

						const distance = calculateDistance(
							userLat,
							userLng,
							eventData.lat,
							eventData.lng
						);
						if (distance > radius) continue;

						if (
							userData.preferences.searchByDate &&
							!eventMeetsUserPreferences(
								eventData,
								userData.preferences
							)
						) {
							continue;
						}

						const creatorName = await fetchCreatorName(
							eventData.creator
						);
						const participantImages = await fetchParticipantImages(
							eventData.participants
						);

						finalEvents.push({
							...eventData,
							creatorName,
							distance,
							participantImages:
								participantImages.filter(Boolean),
							timeLeft: calculateTimeLeft(eventData.date),
						});

						if (finalEvents.length >= totalLimit) break;
					}

					if (querySnapshot.size < limitPerPage) {
						break;
					}
				}

				return finalEvents;
			} catch (err) {
				console.error("Błąd pozyskania danych:", err);
				setError(
					"Wystąpił błąd podczas ładowania wydarzeń. Proszę odświeżyć stronę."
				);
				return [];
			} finally {
				setIsLoading(false);
			}
		},
		[userData]
	);

	const fetchNextEvent = async () => {
		try {
			const newEvents = await fetchEvents();
			if (newEvents.length === 0) {
				return [];
			}

			return newEvents;
		} catch (err) {
			console.error("Błąd podczas pobierania wydarzeń:", err);
			return null;
		}
	};

	useEffect(() => {
		const loadUserDataAndEvents = async () => {
			setIsLoading(true);
			setError(null);
			try {
				await fetchUserData();
			} catch (err) {
				console.error("Błąd ładowania danych użytkownika:", err);
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
		if (userData && events.length === 0) {
			fetchEvents().then((newEvents) => setEvents(newEvents));
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
				setNotificationEventName(eventData.eventName);
				setNotificationType("error");
				setShowNotification(true);
				removeEventFromList(eventId);
				setTimeout(() => setShowNotification(false), 2000);
				return;
			}

			await updateUserEvents(eventId, "joined");
			await updateDoc(eventRef, {
				participants: arrayUnion(user.uid),
			});

			await updateChatParticipants(eventId, user.uid);

			setMyEvents((prevMyEvents) => [...prevMyEvents, eventId]);

			setNotificationEventName(eventData.eventName);
			setNotificationType("success");
			setShowNotification(true);
			removeEventWithAnimation(eventId, "join");
			setTimeout(() => setShowNotification(false), 2000);
			if (eventView === "list") {
				setEventView("list");
				setSelectedEventId(null);
			}
		} catch (err) {
			console.error("Błąd dołączenia do wydarzenia:", err);
		}
	};

	const handleLikeEvent = async (eventId) => {
		try {
			await updateUserEvents(eventId, "liked");

			const eventRef = doc(db, "events", eventId);
			await updateDoc(eventRef, {
				liked: increment(1),
			});

			removeEventWithAnimation(eventId, "like");
			if (eventView === "list") {
				setEventView("list");
				setSelectedEventId(null);
			}
		} catch (error) {
			console.error("Error liking event:", error);
		}
	};

	const handleDislikeEvent = async (eventId) => {
		try {
			await updateUserEvents(eventId, "banned");

			const eventRef = doc(db, "events", eventId);
			await updateDoc(eventRef, {
				disliked: increment(1),
			});

			await updateDoc(eventRef, {
				participants: arrayRemove(auth.currentUser.uid),
			});
			await updateDoc(doc(db, "chats", eventId), {
				participants: arrayRemove(auth.currentUser.uid),
			});
			removeEventWithAnimation(eventId, "dislike");
			if (eventView === "list") {
				setEventView("list");
				setSelectedEventId(null);
			}
		} catch (error) {
			console.error("Error disliking event:", error);
		}
	};

	const removeEventWithAnimation = (eventId, action) => {
		setEvents((prevEvents) => {
			const updatedEvents = prevEvents.map((event) =>
				event.id === eventId
					? { ...event, removing: true, action }
					: event
			);
			return updatedEvents;
		});

		setTimeout(() => {
			removeEventFromList(eventId);
		}, 300);
	};

	const removeEventFromList = useCallback(
		(eventId) => {
			setEvents((prevEvents) => {
				const updatedEvents = prevEvents.filter(
					(event) => event.id !== eventId
				);
				if (updatedEvents.length === 0) {
					setCurrentEventIndex(0);
				} else if (currentEventIndex >= updatedEvents.length) {
					setCurrentEventIndex(updatedEvents.length - 1);
				}
				return updatedEvents;
			});
		},
		[currentEventIndex]
	);

	const handleSelectEvent = (eventId) => {
		setSelectedEventId(eventId);
		const selectedIndex = events.findIndex((event) => event.id === eventId);
		setCurrentEventIndex(selectedIndex);
	};

	const closeCardView = () => {
		setSelectedEventId(null);
		setEventView("list");
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
							<div className="w-16 h-16 flex items-center justify-center">
								{notificationType === "success" ? (
									<Lottie
										animationData={animationCreatedEvent}
										loop={true}
										autoplay={true}
									/>
								) : (
									<FrownIcon className="w-12 h-12 text-red-500" />
								)}
							</div>
							<div>
								<h3 className="text-lg font-bold">
									{notificationType === "success"
										? "Gratulacje!"
										: "Brak miejsc"}
								</h3>
								<p className="text-sm">
									{notificationType === "success"
										? `Dołączyłeś do: ${notificationEventName}`
										: "Przepraszamy, ktoś zajął ostatnie wolne miejsce"}
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
					<EventCardStack
						events={events}
						setEvents={setEvents}
						onJoin={handleJoinEvent}
						onLike={handleLikeEvent}
						onDislike={handleDislikeEvent}
						getTimeLeftColor={getTimeLeftColor}
						fetchNextEvent={fetchNextEvent}
					/>
				)}
				{eventView === "list" && (
					<ListView
						events={events}
						onSelectEvent={handleSelectEvent}
						getTimeLeftColor={getTimeLeftColor}
						setEvents={setEvents}
					/>
				)}
				<AnimatePresence>
					{selectedEventId && (
						<motion.div
							key={selectedEventId}
							initial={{ opacity: 0.6, x: 600 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0.6, x: -600 }}
							transition={{ duration: 0.5 }}
							className="absolute inset-0 bg-gray-100"
						>
							<CardView
								event={events.find(
									(event) => event.id === selectedEventId
								)}
								onSwipe={() => {}}
								nextEvent={() => {}}
								showCloseButton={true}
								showNextButton={false}
								onJoin={handleJoinEvent}
								onLike={handleLikeEvent}
								onDislike={handleDislikeEvent}
								getTimeLeftColor={getTimeLeftColor}
								onClose={closeCardView}
								uName={userData?.name}
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
