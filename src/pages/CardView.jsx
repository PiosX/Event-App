"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
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

export function CardView({
	event,
	nextEvent,
	onClose,
	showCloseButton = false,
	onJoin,
	onLike,
	onDislike,
	getTimeLeftColor,
	formatTimeLeft,
	isRemoving,
	removeAction,
}) {
	const [touchStart, setTouchStart] = useState(null);
	const [touchEnd, setTouchEnd] = useState(null);
	const [isDragging, setIsDragging] = useState(false);
	const [dragDirection, setDragDirection] = useState(null);
	const controls = useAnimation();

	const handleTouchStart = (e) => {
		setTouchEnd(null);
		setTouchStart(e.targetTouches[0].clientX);
	};

	const handleTouchMove = (e) => {
		setTouchEnd(e.targetTouches[0].clientX);
		const distance = touchStart - e.targetTouches[0].clientX;
		if (Math.abs(distance) > 50) {
			setIsDragging(true);
			setDragDirection(distance > 0 ? "left" : "right");
		}
	};

	const handleTouchEnd = async () => {
		if (!touchStart || !touchEnd) return;
		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > 100;
		const isRightSwipe = distance < -100;

		if (isLeftSwipe) {
			await controls.start({
				x: -window.innerWidth - 100,
				rotateX: 15,
				opacity: 0,
				transition: { duration: 0.3 },
			});
			onDislike && onDislike(event.id);
			nextEvent();
		} else if (isRightSwipe) {
			await controls.start({
				x: window.innerWidth + 100,
				rotateX: -15,
				opacity: 0,
				transition: { duration: 0.3 },
			});
			onJoin && onJoin(event.id);
			nextEvent();
		} else {
			controls.start({ x: 0, rotateX: 0, opacity: 1 });
		}
		setIsDragging(false);
		setDragDirection(null);
	};

	useEffect(() => {
		if (isDragging) {
			controls.start({
				x: dragDirection === "left" ? -100 : 100,
				rotateY: dragDirection === "left" ? 15 : -15,
				rotateX: 15,
				opacity: 1,
			});
		} else {
			controls.start({ x: 0, rotateX: 0, rotateY: 0, opacity: 1 });
		}
	}, [isDragging, dragDirection, controls]);

	if (!event) {
		return (
			<div className="h-full flex items-center justify-center bg-gray-100">
				<p className="text-xl text-gray-600 text-center px-4">
					Niestety nie mamy dla Ciebie żadnych wydarzeń :(
				</p>
			</div>
		);
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
			exit={
				isRemoving
					? {
							x:
								removeAction === "join" ||
								removeAction === "like"
									? 300
									: -300,
							opacity: 0,
							transition: { duration: 0.5 },
					  }
					: {}
			}
		>
			<Card
				className="flex-grow flex flex-col bg-white rounded-lg shadow-lg overflow-hidden"
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
									{formatTimeLeft(event.timeLeft)}
								</div>
								{event.distance !== null && (
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
			</Card>
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
					{nextEvent && (
						<button
							onClick={nextEvent}
							className="bg-gray-200 p-3 rounded-full"
						>
							<ChevronRight className="w-6 h-6" />
						</button>
					)}
				</div>
			</div>
			{/* Swipe indicators */}
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
		</motion.div>
	);
}
