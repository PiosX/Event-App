import { useState } from "react";
import {
	Heart,
	X,
	UserPlus,
	MapPin,
	Map,
	ChevronRight,
	ArrowLeft,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";

export function CardView({
	event,
	onSwipe,
	nextEvent,
	onClose,
	showCloseButton = false,
	showNextButton = true,
	onJoin,
	onLike,
	onDislike,
}) {
	const [touchStart, setTouchStart] = useState(null);
	const [touchEnd, setTouchEnd] = useState(null);
	const [showLikeAnimation, setShowLikeAnimation] = useState(false);
	console.log("jestem dalej w cardview...");
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

	const handleTouchStart = (e) => {
		setTouchEnd(null);
		setTouchStart(e.targetTouches[0].clientX);
	};

	const handleTouchMove = (e) => {
		setTouchEnd(e.targetTouches[0].clientX);
	};

	const handleTouchEnd = () => {
		if (!touchStart || !touchEnd) return;
		const distance = touchStart - touchEnd;
		const isLeftSwipe = distance > 50;
		if (isLeftSwipe) {
			onSwipe(1);
		}
	};

	const handleJoin = () => {
		onJoin && onJoin(event.id);
	};

	const handleLike = () => {
		setShowLikeAnimation(true);
		setTimeout(() => {
			setShowLikeAnimation(false);
			onLike && onLike(event.id);
		}, 300);
	};

	const handleDislike = () => {
		onDislike && onDislike(event.id);
	};

	return (
		<div className="h-full p-4 bg-gray-100 flex flex-col">
			<motion.div
				className="flex-grow flex flex-col bg-white rounded-lg shadow-lg overflow-hidden"
				initial={{ opacity: 0, scale: 0.8 }}
				animate={{ opacity: 1, scale: 1 }}
				transition={{ duration: 0.3 }}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
			>
				<div className="flex-grow overflow-y-auto">
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
							{event.distance !== null && (
								<div className="absolute top-4 right-4 bg-gray-200 text-gray-800 px-2 py-2 rounded-md text-base font-medium flex items-center">
									<MapPin className="w-5 h-5 mr-1" />
									{event.distance.toFixed(1)} km
								</div>
							)}
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
										) : (
											""
										)
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
										"bg-accent text-accent-foreground",
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
				</div>
			</motion.div>
			<div className="mt-4 flex justify-between items-center p-4 bg-white shadow-lg rounded-lg">
				<div className="flex-1"></div>
				<div className="flex space-x-4">
					{onJoin && (
						<button
							className="bg-green-500 text-white p-3 rounded-full w-12 h-12 flex items-center justify-center"
							onClick={handleJoin}
						>
							<UserPlus className="w-6 h-6" />
						</button>
					)}
					{onLike && (
						<button
							className="bg-blue-500 text-white p-3 rounded-full relative w-12 h-12 flex items-center justify-center"
							onClick={handleLike}
						>
							<AnimatePresence>
								{showLikeAnimation ? (
									<motion.div
										key="filled"
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										exit={{ scale: 0 }}
										transition={{ duration: 0.3 }}
										className="absolute inset-0 flex items-center justify-center"
									>
										<Heart className="w-6 h-6 fill-current" />
									</motion.div>
								) : (
									<Heart className="w-6 h-6" />
								)}
							</AnimatePresence>
						</button>
					)}
					{onDislike && (
						<button
							className="bg-red-500 text-white p-3 rounded-full w-12 h-12 flex items-center justify-center"
							onClick={handleDislike}
						>
							<X className="w-6 h-6" />
						</button>
					)}
				</div>
				<div className="flex-1 flex justify-end">
					{showNextButton && (
						<button
							onClick={nextEvent}
							className="bg-gray-200 p-3 rounded-full"
						>
							<ChevronRight className="w-6 h-6" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
