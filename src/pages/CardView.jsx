"use client";

import { useState, useEffect } from "react";
import { motion, useAnimation, AnimatePresence } from "framer-motion";
import {
	Heart,
	X,
	UserPlus,
	MapPin,
	Map,
	ChevronRight,
	ArrowLeft,
	Clock,
	Check,
} from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { calculateTimeLeft, formatTimeLeft } from "@/lib/event-functions";

export function CardView({
	event,
	onSwipe,
	nextEvent,
	showCloseButton = false,
	showNextButton = true,
	onJoin,
	onLike,
	onDislike,
	getTimeLeftColor,
	isInteractive = true,
	onClose,
}) {
	const [touchStart, setTouchStart] = useState(null);
	const [touchEnd, setTouchEnd] = useState(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragDirection, setDragDirection] = useState(null);
	const [time, setTime] = useState(calculateTimeLeft(event.date));
	const controls = useAnimation();

	useEffect(() => {
		const timer = setInterval(() => {
			setTime(calculateTimeLeft(event.date));
		}, 1000);

		return () => clearInterval(timer);
	}, []);

	const handleTouchStart = (e) => {
		if (!isInteractive) return;
		setTouchEnd(null);
		setTouchStart(e.targetTouches[0].clientX);
	};

	const handleTouchMove = (e) => {
		if (!isInteractive) return;
		setTouchEnd(e.targetTouches[0].clientX);
		const distance = touchStart - e.targetTouches[0].clientX;
		if (Math.abs(distance) > 50) {
			setIsDragging(true);
			setDragDirection(distance > 0 ? "left" : "right");
		}
	};

	const handleTouchEnd = async () => {
		if (!isInteractive || !touchStart || !touchEnd) return;
		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > 100;
		const isRightSwipe = distance < -100;

		if (isLeftSwipe) {
			await controls.start({
				x: -window.innerWidth - 100,
				opacity: 0,
				transition: { duration: 0.3 },
			});
			onSwipe("left");
		} else if (isRightSwipe) {
			await controls.start({
				x: window.innerWidth + 100,
				opacity: 0,
				transition: { duration: 0.3 },
			});
			onSwipe("right");
		} else {
			controls.start({ x: 0, opacity: 1 });
		}
		setIsDragging(false);
		setDragDirection(null);
	};

	useEffect(() => {
		if (isDragging) {
			controls.start({
				x: dragDirection === "left" ? -100 : 100,
				opacity: 1,
			});
		}
	}, [isDragging, dragDirection, controls]);

	if (!event) {
		return null;
	}

	const eventDate = new Date(event.date);
	const mapping = {
		gender: "Płeć",
		age: "Wiek",
		location: "Lokalizacja",
		other: "Inne",
	};

	const openGoogleMaps = () => {
		const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
			event.street + ", " + event.city + ", Polska"
		)}`;
		window.open(url, "_blank");
	};

	return (
		<motion.div
			className="h-full p-4 bg-gray-100 flex flex-col"
			initial={false}
			animate={controls}
			layout
		>
			<Card
				className="flex-grow flex flex-col bg-white rounded-lg shadow-lg overflow-hidden relative"
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
			>
				<CardContent className="flex-grow overflow-y-auto p-0">
					<div className="relative h-[66vh]">
						<img
							src={event.image}
							alt={event.eventName}
							className="w-full h-full object-cover"
						/>
						<div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black">
							{showCloseButton && (
								<div className="absolute top-4 left-4">
									<button
										onClick={onClose}
										className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-full"
									>
										<ArrowLeft className="w-6 h-6" />
									</button>
								</div>
							)}
							<div className="absolute top-4 right-4 flex space-x-2">
								<div
									className={`${getTimeLeftColor(
										event.timeLeft
									)} text-gray-800 px-2 py-1 rounded-md text-sm font-medium flex items-center`}
								>
									<Clock className="w-4 h-4 mr-1" />
									{formatTimeLeft(time)}
								</div>
								{event.distance !== undefined &&
									event.distance !== null && (
										<div className="bg-gray-200 text-gray-800 px-2 py-1 rounded-md text-sm font-medium flex items-center">
											<MapPin className="w-4 h-4 mr-1" />
											{event.distance.toFixed(1)} km
										</div>
									)}
							</div>
							<div className="absolute bottom-0 left-0 right-0 p-6">
								<h2 className="text-white text-3xl font-bold mb-2">
									{event.eventName}
								</h2>
								<div className="flex flex-wrap gap-2 mb-2">
									<span className="bg-black text-white px-2 py-1 rounded-full text-sm">
										Kategoria:{" "}
										{event.selectedCategories.join(", ")}
									</span>
									{Object.entries(
										event.requirements || {}
									).map(([key, value]) =>
										key !== "none" ? (
											<span
												key={key}
												className="bg-gray-200 text-gray-800 px-2 py-1 rounded-full text-xs"
											>
												{mapping[key] || ""}: {value}
											</span>
										) : null
									)}
								</div>
								<div className="flex items-center justify-between">
									<p className="text-white text-lg font-semibold">
										Liczba miejsc:{" "}
										{event.capacity === -1
											? "Brak limitu"
											: `${event.participants.length}/${event.capacity}`}
									</p>
									<div className="flex -space-x-2 overflow-hidden">
										{event.participantImages
											.slice(0, 5)
											.map((image, index) => (
												<img
													key={index}
													src={image}
													alt="Participant"
													width={28}
													height={28}
													className="inline-block h-7 w-7 rounded-full border-2 border-white"
												/>
											))}
										{event.participants.length > 5 && (
											<span className="flex items-center justify-center h-7 w-7 rounded-full bg-gray-300 text-xs font-medium text-gray-800 border-2 border-white">
												+{event.participants.length - 5}
											</span>
										)}
									</div>
								</div>
								<p className="text-white text-sm mt-2">
									Utworzone przez: {event.creatorName}
								</p>
								<div className="flex items-center text-white text-sm mt-2">
									<MapPin className="w-4 h-4 mr-1" />
									<span>
										{event.street}, {event.city}
									</span>
								</div>
							</div>
						</div>
					</div>

					<div className="p-6">
						<p className="text-sm mb-4">{event.eventDescription}</p>
						<h3 className="font-bold mb-1">
							Data wydarzenia:{" "}
							{format(eventDate, "dd MMMM yyyy", { locale: pl })}
						</h3>
						<p className="text-sm mb-4">Godzina: {event.time}</p>
						<div className="mb-4">
							<Calendar
								mode="single"
								selected={eventDate}
								onSelect={() => {}}
								defaultMonth={eventDate}
								locale={pl}
								className="rounded-md border w-full"
								classNames={{
									months: "w-full",
									month: "w-full",
									table: "w-full border-collapse",
									head_row: "flex w-full mt-2",
									head_cell:
										"text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
									row: "flex w-full mt-2",
									cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 w-full",
									day: "h-9 w-full p-0 font-normal aria-selected:opacity-100",
									day_selected:
										"bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
									day_today:
										"bg-accent text-accent-foreground rounded-md",
									day_outside:
										"text-muted-foreground opacity-50",
									day_disabled:
										"text-muted-foreground opacity-50",
									day_range_middle:
										"aria-selected:bg-accent aria-selected:text-accent-foreground",
									day_hidden: "invisible",
								}}
							/>
						</div>
						<button
							onClick={openGoogleMaps}
							className="w-full py-2 px-4 bg-primary text-white rounded-md flex items-center justify-center"
						>
							<Map className="w-5 h-5 mr-2" />
							Otwórz w Google Maps
						</button>
					</div>
				</CardContent>
				<AnimatePresence>
					{isDragging && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							className="absolute inset-0 flex items-center justify-center pointer-events-none"
						>
							{dragDirection === "left" ? (
								<div className="bg-red-500 rounded-lg p-4">
									<X className="w-24 h-24 text-white" />
								</div>
							) : (
								<div className="bg-green-500 rounded-lg p-4">
									<Check className="w-24 h-24 text-white" />
								</div>
							)}
						</motion.div>
					)}
				</AnimatePresence>
			</Card>
			{isInteractive && (
				<div className="mt-4 flex justify-between items-center p-4 bg-white shadow-lg rounded-lg">
					<div className="flex-1"></div>
					<div className="flex space-x-4">
						{onDislike && (
							<button
								className="bg-red-500 text-white p-3 rounded-full w-12 h-12 flex items-center justify-center"
								onClick={() => onDislike(event.id)}
							>
								<X className="w-6 h-6" />
							</button>
						)}
						{onLike && (
							<button
								className="bg-blue-500 text-white p-3 rounded-full relative w-12 h-12 flex items-center justify-center"
								onClick={() => onLike(event.id)}
							>
								<Heart className="w-6 h-6" />
							</button>
						)}
						{onJoin && (
							<button
								className="bg-green-500 text-white p-3 rounded-full w-12 h-12 flex items-center justify-center"
								onClick={() => onJoin(event.id)}
							>
								<UserPlus className="w-6 h-6" />
							</button>
						)}
					</div>
					<div className="flex-1 flex justify-end">
						{showNextButton && nextEvent && (
							<button
								onClick={nextEvent}
								className="bg-gray-200 p-3 rounded-full"
							>
								<ChevronRight className="w-6 h-6" />
							</button>
						)}
					</div>
				</div>
			)}
		</motion.div>
	);
}
