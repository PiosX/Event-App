import { useState, useEffect } from "react";
import {
	UserPlus,
	Heart,
	PlusCircle,
	Calendar,
	MapPin,
	Clock,
	X,
} from "lucide-react";
import Lottie from "lottie-react";
import animationCreatedEvent from "../assets/animation-createdEvent.json";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardView } from "./CardView";
import { format, isToday } from "date-fns";
import { pl } from "date-fns/locale";
import { db, auth } from "../firebaseConfig";
import {
	collection,
	query,
	where,
	getDocs,
	doc,
	getDoc,
	updateDoc,
	deleteDoc,
	arrayRemove,
	arrayUnion,
} from "firebase/firestore";
import {
	calculateDistance,
	calculateTimeLeft,
	getTimeLeftColor,
	formatTimeLeft,
} from "@/lib/event-functions";
import CreateEvent from "./CreateEvent";

const handleTimeChange = async (eventId, newTime) => {
	try {
		await updateDoc(doc(db, "events", eventId), { time: newTime });
		setEvents((prevEvents) => ({
			...prevEvents,
			[activeTab]: prevEvents[activeTab].map((event) =>
				event.id === eventId ? { ...event, time: newTime } : event
			),
		}));
	} catch (error) {
		console.error("Error updating time:", error);
	}
};

export function MyEvents() {
	const [activeTab, setActiveTab] = useState("participating");
	const [selectedEventId, setSelectedEventId] = useState(null);
	const [events, setEvents] = useState({
		participating: [],
		liked: [],
		created: [],
	});
	const [loading, setLoading] = useState(true);
	const [userData, setUserData] = useState(null);
	const [editingEvent, setEditingEvent] = useState(null); // Added state for editing event
	const [showNotification, setShowNotification] = useState(false);
	const [notificationType, setNotificationType] = useState("success");
	const mapping = {
		gender: "Płeć",
		age: "Wiek",
		location: "Lokalizacja",
		other: "Inne",
	};

	useEffect(() => {
		fetchUserData();
	}, []);

	useEffect(() => {
		if (userData) {
			fetchEvents();
		}
	}, [activeTab, userData]);

	useEffect(() => {
		const timer = setInterval(() => {
			setEvents((prevEvents) => ({
				participating: prevEvents.participating.map((event) => ({
					...event,
					timeLeft: calculateTimeLeft(event.date),
				})),
				liked: prevEvents.liked.map((event) => ({
					...event,
					timeLeft: calculateTimeLeft(event.date),
				})),
				created: prevEvents.created.map((event) => ({
					...event,
					timeLeft: calculateTimeLeft(event.date),
				})),
			}));
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	const fetchUserData = async () => {
		const user = auth.currentUser;
		if (!user) return;

		try {
			const usersRef = collection(db, "users");
			const q = query(usersRef, where("uid", "==", user.uid));
			const querySnapshot = await getDocs(q);

			if (!querySnapshot.empty) {
				const userDoc = querySnapshot.docs[0];
				setUserData(userDoc.data());
			} else {
				console.error("Brak dokumentu użytkownika");
			}
		} catch (error) {
			console.error("Nie znaleziono danych użytkownika:", error);
		}
	};

	const fetchEvents = async () => {
		setLoading(true);
		const user = auth.currentUser;
		if (!user || !userData) return;

		try {
			let fetchedEvents = [];

			if (activeTab === "participating" || activeTab === "liked") {
				const myEventsDoc = await getDoc(doc(db, "myevents", user.uid));
				const myEventsData = myEventsDoc.data() || {};
				const eventIds =
					myEventsData[
						activeTab === "participating" ? "joined" : "liked"
					] || [];

				fetchedEvents = await Promise.all(
					eventIds.map(async (eventId) => {
						const eventDoc = await getDoc(
							doc(db, "events", eventId)
						);
						if (eventDoc.exists()) {
							const eventData = eventDoc.data();
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

							const distance = calculateDistance(
								userData.lat,
								userData.lng,
								eventData.lat,
								eventData.lng
							);

							const timeLeft = calculateTimeLeft(eventData.date);

							return {
								id: eventDoc.id,
								...eventData,
								creatorName,
								participantImages:
									participantImages.filter(Boolean),
								distance,
								timeLeft,
							};
						}
						return null;
					})
				);
				fetchedEvents = fetchedEvents.filter((event) => event !== null);
			} else if (activeTab === "created") {
				const q = query(
					collection(db, "events"),
					where("creator", "==", user.uid)
				);
				const querySnapshot = await getDocs(q);
				fetchedEvents = await Promise.all(
					querySnapshot.docs.map(async (doc) => {
						const eventData = doc.data();
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

						const distance = calculateDistance(
							userData.lat,
							userData.lng,
							eventData.lat,
							eventData.lng
						);

						const timeLeft = calculateTimeLeft(eventData.date);

						return {
							id: doc.id,
							...eventData,
							participantImages:
								participantImages.filter(Boolean),
							distance,
							timeLeft,
						};
					})
				);
			}

			setEvents((prevEvents) => ({
				...prevEvents,
				[activeTab]: fetchedEvents,
			}));
		} catch (error) {
			console.error("Nie udało się uzyskać wydarzeń:", error);
		}

		setLoading(false);
	};

	const handleSelectEvent = (eventId) => {
		setSelectedEventId(eventId);
	};

	const handleCloseCardView = () => {
		setSelectedEventId(null);
	};

	const handleLeaveEvent = async (eventId) => {
		const user = auth.currentUser;
		if (!user) return;

		try {
			const myEventsRef = doc(db, "myevents", user.uid);
			await updateDoc(myEventsRef, {
				joined: arrayRemove(eventId),
				banned: arrayUnion(eventId),
			});

			const eventRef = doc(db, "events", eventId);
			await updateDoc(eventRef, {
				participants: arrayRemove(user.uid),
			});

			const chatRef = doc(db, "chats", eventId);
			await updateDoc(chatRef, {
				participants: arrayRemove(user.uid),
			});

			setEvents((prevEvents) => ({
				...prevEvents,
				participating: prevEvents.participating.filter(
					(event) => event.id !== eventId
				),
			}));
			setSelectedEventId(null);
		} catch (error) {
			console.error(error);
		}
	};

	const handleLikeEvent = async (eventId) => {
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

			const myEventsRef = doc(db, "myevents", user.uid);
			await updateDoc(myEventsRef, {
				liked: arrayRemove(eventId),
				joined: arrayUnion(eventId),
			});

			await updateDoc(eventRef, {
				participants: arrayUnion(user.uid),
			});

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

			const eventToMove = events.liked.find(
				(event) => event.id === eventId
			);
			setEvents((prevEvents) => ({
				...prevEvents,
				liked: prevEvents.liked.filter((event) => event.id !== eventId),
				participating: [...prevEvents.participating, eventToMove],
			}));
			setSelectedEventId(null);
		} catch (error) {
			console.error("Nie udało się dołączyć do wydarzenia:", error);
		}
	};

	const handleDeleteEvent = async (eventId) => {
		try {
			await deleteDoc(doc(db, "events", eventId));
			await deleteDoc(doc(db, "chats", eventId));

			setEvents((prevEvents) => ({
				...prevEvents,
				created: prevEvents.created.filter(
					(event) => event.id !== eventId
				),
			}));
			setSelectedEventId(null);
		} catch (error) {
			console.error("Nie udało się usunąć wydarzenia:", error);
		}
	};

	const handleCloseEdit = (wasUpdated) => {
		setEditingEvent(null);
		if (wasUpdated) {
			fetchEvents();
			showSuccessNotification();
		}
	};

	const showSuccessNotification = () => {
		setNotificationType("success");
		setShowNotification(true);
		setTimeout(() => setShowNotification(false), 3000);
	};

	const handleEditEvent = (event) => {
		setEditingEvent(event);
	};

	const renderEventList = () => (
		<div className="bg-gray-100 h-full overflow-hidden">
			<div className="h-full overflow-y-auto p-4">
				<div className="max-w-2xl mx-auto space-y-4">
					{loading ? (
						<div className="h-full flex items-center justify-center">
							<p className="text-xl text-gray-600 text-center px-4">
								Ładowanie...
							</p>
						</div>
					) : events[activeTab].length === 0 ? (
						<div className="h-full flex items-center justify-center">
							<p className="text-xl text-gray-600 text-center px-4">
								Brak wydarzeń do wyświetlenia
							</p>
						</div>
					) : (
						<AnimatePresence>
							{events[activeTab].map((event) => (
								<motion.div
									key={event.id}
									className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer"
									onClick={() => handleSelectEvent(event.id)}
									whileHover={{
										y: -5,
										boxShadow:
											"0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
									}}
									transition={{ duration: 0.2 }}
									initial={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0, y: -20 }}
								>
									<div className="relative">
										<img
											src={event.image}
											alt={event.eventName}
											className="w-full h-56 object-cover"
										/>
										<div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black opacity-60"></div>
										<div className="absolute top-2 right-2 flex space-x-2">
											<div
												className={`${getTimeLeftColor(
													event.timeLeft
												)} text-gray-800 px-2 py-1 rounded-md text-sm font-medium flex items-center`}
											>
												<Clock className="w-4 h-4 mr-1" />
												{formatTimeLeft(event.timeLeft)}
											</div>
											{event.distance !== null && (
												<div className="bg-gray-200 text-gray-800 px-2 py-1 rounded-md text-sm font-medium flex items-center">
													<MapPin className="w-4 h-4 mr-1" />
													{event.distance.toFixed(1)}{" "}
													km
												</div>
											)}
										</div>
										<div className="absolute bottom-2 left-2 right-2">
											<div className="flex flex-wrap gap-2">
												<span className="bg-black text-white px-2 py-1 rounded-full text-xs">
													Kategoria:{" "}
													{event.selectedCategories.join(
														", "
													)}
												</span>
												{Object.entries(
													event.requirements || {}
												).map(([key, value]) =>
													key !== "none" ? (
														<span
															key={key}
															className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs"
														>
															{mapping[key] || ""}
															: {value}
														</span>
													) : (
														""
													)
												)}
											</div>
										</div>
									</div>
									<div className="p-4">
										<h2 className="text-xl font-bold mb-2">
											{event.eventName}
										</h2>
										<p className="text-gray-600 mb-4 line-clamp-2">
											{event.eventDescription}
										</p>
										<div className="flex items-center mb-2">
											<Calendar className="w-5 h-5 mr-2 text-gray-500" />
											<span className="font-semibold">
												{format(
													new Date(event.date),
													"dd MMMM yyyy",
													{
														locale: pl,
													}
												)}{" "}
												o {event.time}
											</span>
										</div>
										<div className="flex items-center mb-4">
											<MapPin className="w-5 h-5 mr-2 text-gray-500" />
											<span className="font-semibold">
												{event.street}, {event.city}
											</span>
										</div>
										<div className="flex justify-between items-center">
											<div className="flex items-center">
												<span className="text-sm font-medium mr-2">
													Uczestnicy:
												</span>
												<div className="flex -space-x-2 overflow-hidden">
													{event.participantImages
														.slice(0, 3)
														.map((image, index) => (
															<img
																key={index}
																className="inline-block h-6 w-6 rounded-full ring-2 ring-white"
																src={image}
																alt={`Participant ${
																	index + 1
																}`}
															/>
														))}
													{event.participants.length >
														3 && (
														<span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-300 text-xs font-medium text-gray-800 ring-2 ring-white">
															+
															{event.participants
																.length - 3}
														</span>
													)}
												</div>
											</div>
											<div className="text-sm">
												<span className="font-medium">
													{event.capacity === -1
														? `${event.participants.length}`
														: `${event.participants.length}/${event.capacity}`}
												</span>{" "}
												osób już dołączyło
											</div>
										</div>
									</div>
								</motion.div>
							))}
						</AnimatePresence>
					)}
				</div>
			</div>
		</div>
	);

	return (
		<div className="h-full bg-gray-100 flex flex-col">
			<div className="bg-white shadow z-10">
				<div className="container mx-auto px-2 sm:px-4 py-2 flex items-center justify-center h-14 overflow-x-auto">
					<div className="flex items-center space-x-2 justify-center sm:space-x-4 min-w-full sm:min-w-0">
						<Button
							variant={
								activeTab === "participating"
									? "default"
									: "ghost"
							}
							onClick={() => {
								setActiveTab("participating");
								handleCloseCardView();
							}}
							className="flex items-center space-x-1 flex-shrink-0 text-xs sm:text-sm"
						>
							<UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
							<span className="hidden sm:inline">
								Biorę udział
							</span>
							<span className="sm:hidden">Udział</span>
						</Button>
						<Button
							variant={
								activeTab === "liked" ? "default" : "ghost"
							}
							onClick={() => {
								setActiveTab("liked");
								handleCloseCardView();
							}}
							className="flex items-center space-x-1 flex-shrink-0 text-xs sm:text-sm"
						>
							<Heart className="w-4 h-4 sm:w-5 sm:h-5" />
							<span>Polubione</span>
						</Button>
						<Button
							variant={
								activeTab === "created" ? "default" : "ghost"
							}
							onClick={() => {
								setActiveTab("created");
								handleCloseCardView();
							}}
							className="flex items-center space-x-1 flex-shrink-0 text-xs sm:text-sm"
						>
							<PlusCircle className="w-4 h-4 sm:w-5 sm:h-5" />
							<span>Utworzone</span>
						</Button>
					</div>
				</div>
			</div>

			<div className="flex-grow overflow-hidden relative">
				{!selectedEventId && renderEventList()}
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
								event={events[activeTab].find(
									(event) => event.id === selectedEventId
								)}
								onClose={handleCloseCardView}
								showCloseButton={true}
								showNextButton={false}
								onJoin={
									activeTab === "liked"
										? () => handleLikeEvent(selectedEventId)
										: null
								}
								onDislike={
									activeTab === "participating"
										? () =>
												handleLeaveEvent(
													selectedEventId
												)
										: activeTab === "created"
										? () =>
												handleDeleteEvent(
													selectedEventId
												)
										: null
								}
								onEdit={
									activeTab === "created"
										? () =>
												handleEditEvent(
													events[activeTab].find(
														(event) =>
															event.id ===
															selectedEventId
													)
												)
										: null
								}
								getTimeLeftColor={getTimeLeftColor}
								formatTimeLeft={formatTimeLeft}
								isOtherPage={true}
								forceEnableToday={true}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
			{editingEvent && (
				<div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
					<div className="bg-white rounded-lg p-4 w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
						<button
							onClick={handleCloseEdit}
							className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
						>
							<X className="w-6 h-6" />
						</button>
						<CreateEvent
							eventToEdit={editingEvent}
							onEventCreated={(wasUpdated) =>
								handleCloseEdit(wasUpdated)
							}
							onCancel={() => handleCloseEdit(false)}
						/>
					</div>
				</div>
			)}
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
								<Lottie
									animationData={animationCreatedEvent}
									loop={true}
									autoplay={true}
								/>
							</div>
							<div>
								<h3 className="text-lg font-bold">Sukces!</h3>
								<p className="text-sm">
									Pomyślnie zapisano zmiany.
								</p>
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default MyEvents;
