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
	deleteDoc,
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

	useEffect(() => {
		fetchEvents();
	}, []);

	const fetchEvents = async () => {
		const user = auth.currentUser;
		if (!user) return;

		try {
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

			let q = query(eventsRef);

			// Fetch all events
			const querySnapshot = await getDocs(q);

			const fetchedEvents = await Promise.all(
				querySnapshot.docs.map(async (doc) => {
					const eventData = doc.data();
					// Filter out events created by the current user or in the excluded list
					if (
						eventData.creator === user.uid ||
						excludedEvents.includes(doc.id)
					) {
						return null;
					}

					const creatorQuery = query(
						collection(db, "users"),
						where("uid", "==", eventData.creator)
					);
					const creatorSnapshot = await getDocs(creatorQuery);
					const creatorName = !creatorSnapshot.empty
						? creatorSnapshot.docs[0].data().name
						: "Nieznany";

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

			// filtered events
			setEvents(fetchedEvents.filter((event) => event !== null));
		} catch (error) {
			console.error("Error fetching events:", error);
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

		// refresh
		fetchEvents();
	};

	const handleJoinEvent = async (eventId) => {
		await updateUserEvents(eventId, "joined");

		const eventRef = doc(db, "events", eventId);
		await updateDoc(eventRef, {
			participants: arrayUnion(auth.currentUser.uid),
		});

		const chatRef = doc(db, "chats", eventId);
		await updateDoc(chatRef, {
			participants: arrayUnion(auth.currentUser.uid),
		});

		setShowCongratulations(true);
		setSelectedEventId(null);
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

	useEffect(() => {
		if (events.length > 0 && currentEventIndex >= events.length) {
			setCurrentEventIndex(0);
		}
	}, [events, currentEventIndex]);

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

	const currentEvent = events[currentEventIndex];

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
						{events.length > 0 && currentEvent ? (
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
									event={currentEvent}
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
					userPreferences={{
						interests: ["Sport", "Muzyka"],
						location: "Warszawa",
						usePersonLimit: true,
						personLimit: 50,
						meetRequirements: true,
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
