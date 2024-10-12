import { useState, useEffect } from "react";
import {
	UserPlus,
	Heart,
	PlusCircle,
	X,
	ChevronLeft,
	Calendar,
	MapPin,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CardView } from "./CardView";
import { format } from "date-fns";
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

export function MyEvents() {
	const [activeTab, setActiveTab] = useState("participating");
	const [selectedEventId, setSelectedEventId] = useState(null);
	const [events, setEvents] = useState({
		participating: [],
		liked: [],
		created: [],
	});
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		fetchEvents();
	}, [activeTab]);

	const fetchEvents = async () => {
		setLoading(true);
		const user = auth.currentUser;
		if (!user) return;

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

							return {
								id: eventDoc.id,
								...eventData,
								creatorName,
								participantImages:
									participantImages.filter(Boolean),
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
						return {
							id: doc.id,
							...eventData,
							participantImages:
								participantImages.filter(Boolean),
						};
					})
				);
			}

			setEvents((prevEvents) => ({
				...prevEvents,
				[activeTab]: fetchedEvents,
			}));
		} catch (error) {
			console.error("Error fetching events:", error);
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

			setEvents((prevEvents) => ({
				...prevEvents,
				participating: prevEvents.participating.filter(
					(event) => event.id !== eventId
				),
			}));
			setSelectedEventId(null);
		} catch (error) {
			console.error("Error leaving event:", error);
		}
	};

	const handleLikeEvent = async (eventId) => {
		const user = auth.currentUser;
		if (!user) return;

		try {
			const myEventsRef = doc(db, "myevents", user.uid);
			await updateDoc(myEventsRef, {
				liked: arrayRemove(eventId),
				joined: arrayUnion(eventId),
			});

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
			console.error("Error joining liked event:", error);
		}
	};

	const handleDeleteEvent = async (eventId) => {
		try {
			await deleteDoc(doc(db, "events", eventId));
			setEvents((prevEvents) => ({
				...prevEvents,
				created: prevEvents.created.filter(
					(event) => event.id !== eventId
				),
			}));
			setSelectedEventId(null);
		} catch (error) {
			console.error("Error deleting event:", error);
		}
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
												).map(([key, value]) => (
													<span
														key={key}
														className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs"
													>
														{key}: {value}
													</span>
												))}
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
													{ locale: pl }
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
				<div className="container mx-auto px-4 py-2 flex items-center justify-between h-14">
					<div className="flex-1"></div>
					<div className="flex items-center space-x-4">
						<Button
							variant={
								activeTab === "participating"
									? "default"
									: "ghost"
							}
							onClick={() => setActiveTab("participating")}
							className="flex items-center space-x-1"
						>
							<UserPlus className="w-5 h-5" />
							<span className="text-sm">Biorę udział</span>
						</Button>
						<Button
							variant={
								activeTab === "liked" ? "default" : "ghost"
							}
							onClick={() => setActiveTab("liked")}
							className="flex items-center space-x-1"
						>
							<Heart className="w-5 h-5" />
							<span className="text-sm">Polubione</span>
						</Button>
						<Button
							variant={
								activeTab === "created" ? "default" : "ghost"
							}
							onClick={() => setActiveTab("created")}
							className="flex items-center space-x-1"
						>
							<PlusCircle className="w-5 h-5" />
							<span className="text-sm">Utworzone</span>
						</Button>
					</div>
					<div className="flex-1"></div>
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
							<div className="relative h-full">
								<CardView
									event={events[activeTab].find(
										(event) => event.id === selectedEventId
									)}
									onClose={handleCloseCardView}
									showCloseButton={true}
									showNextButton={false}
									onJoin={
										activeTab === "liked"
											? handleLikeEvent
											: undefined
									}
									onLike={undefined}
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
											: activeTab === "liked"
											? () =>
													handleLeaveEvent(
														selectedEventId
													)
											: undefined
									}
								/>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

export default MyEvents;
