import { useState, useEffect } from "react";
import { Calendar, MapPin, Clock, Timer } from "lucide-react";
import { format, parseISO, differenceInHours } from "date-fns";
import { pl } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import animationNotFound from "../assets/animation-notFound.json";
import {
	calculateTimeLeft,
	getTimeLeftColor,
	formatTimeLeft,
	calculateEventDuration,
	getHourWord,
} from "@/lib/event-functions";

export function ListView({
	events,
	onSelectEvent,
	getTimeLeftColor,
	setEvents,
}) {
	useEffect(() => {
		const timer = setInterval(() => {
			setEvents((prevEvents) =>
				prevEvents.map((event) => ({
					...event,
					timeLeft: calculateTimeLeft(
						event.date,
						event.customDuration,
						event.endDate
					),
				}))
			);
		}, 1000);
		return () => clearInterval(timer);
	}, []);

	const mapping = {
		gender: "Płeć",
		age: "Wiek",
		location: "Lokalizacja",
		other: "Inne",
	};

	if (events.length === 0) {
		return (
			<div className="h-full flex flex-col items-center justify-center">
				<Lottie
					animationData={animationNotFound}
					loop={true}
					autoplay={true}
					style={{ width: 200, height: 200 }}
				/>
				<p className="text-xl text-gray-600 text-center px-4">
					Niestety nie mamy dla Ciebie żadnych wydarzeń :(
				</p>
			</div>
		);
	}

	return (
		<div className="bg-gray-100 h-full overflow-hidden">
			<div className="h-full overflow-y-auto p-4">
				<div className="max-w-2xl mx-auto space-y-4">
					<AnimatePresence>
						{events.map((event, index) => (
							<motion.div
								key={event.id}
								className="bg-white rounded-lg shadow-lg overflow-hidden cursor-pointer"
								onClick={() => onSelectEvent(event.id)}
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
												{event.distance.toFixed(1)} km
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
												event.requirements
											).map(([key, value]) =>
												key !== "none" ? (
													<span
														key={key}
														className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs"
													>
														{mapping[key] || ""}:{" "}
														{value}
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
												parseISO(event.date),
												"EEE, dd MMMM yyyy",
												{
													locale: pl,
												}
											)}
										</span>
									</div>
									<div className="flex items-center mb-2">
										<Clock className="w-5 h-5 mr-2 text-gray-500" />
										<span className="font-semibold">
											O godzinie: {event.time}
										</span>
									</div>
									<div className="flex items-center mb-4">
										<Timer className="w-5 h-5 mr-2 text-gray-500" />
										<span className="font-semibold">
											Czas trwania:{" "}
											{calculateEventDuration(
												event.date,
												event.endDate
											)}{" "}
											{getHourWord(
												calculateEventDuration(
													event.date,
													event.endDate
												)
											)}
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
													.map(
														(
															participant,
															index
														) => (
															<img
																key={index}
																className="inline-block h-6 w-6 rounded-full ring-2 ring-white"
																src={
																	participant
																}
																alt={`Participant ${
																	index + 1
																}`}
															/>
														)
													)}
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
				</div>
			</div>
		</div>
	);
}
