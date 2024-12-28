"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { X, Infinity } from "lucide-react";
import Cropper from "react-easy-crop";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { pl } from "date-fns/locale";
import placeholder from "../assets/placeholder.jpg";
import { db } from "../firebaseConfig";
import {
	collection,
	addDoc,
	setDoc,
	doc,
	getDoc,
	query,
	where,
	getDocs,
	updateDoc,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import {
	getStorage,
	ref,
	uploadBytes,
	getDownloadURL,
	deleteObject,
} from "firebase/storage";
import { processImage } from "@/lib/process-image";
import { getCoordinates, fetchCreatorName } from "@/lib/event-functions";
import animationData from "../assets/animation-createdEvent.json";
import Lottie from "lottie-react";
import { motion } from "framer-motion";
import {
	isToday,
	addHours,
	isBefore,
	isAfter,
	parseISO,
	format,
	endOfDay,
	addDays,
} from "date-fns";
import { getCurrentTime } from "@/lib/event-functions";
import SingleRowCalendar from "@/components/ui/SingleRowCalendar";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

const categories = [
	"Podróże",
	"Zwiedzanie",
	"Wędrówki",
	"Camping",
	"Festiwale",
	"Koncerty",
	"Imprezy",
	"Gry planszowe",
	"Gry wideo",
	"Escape roomy",
	"Karaoke",
	"Gotowanie",
	"Degustacja",
	"Kino",
	"Teatr",
	"Stand-up",
	"Taniec",
	"Joga",
	"Fitness",
	"Siłownia",
	"Bieganie",
	"Jazda na rowerze",
	"Siatkówka",
	"Tenis",
	"Badminton",
	"Golf",
	"Wspinaczka",
	"Paintball",
	"Laser tag",
	"Squash",
	"Zumba",
	"Fotografia",
	"Sztuka",
	"Muzea",
	"Galerie sztuki",
	"Pikniki",
	"Plaża",
	"Pływanie",
	"Surfing",
	"Windsurfing",
	"Nurkowanie",
	"Żeglarstwo",
	"Kajakarstwo",
	"Wędkarstwo",
	"Skoki spadochronowe",
	"Bungee jumping",
	"Loty balonem",
	"Motoryzacja",
	"Jazda konna",
	"Snowboarding",
	"Narciarstwo",
	"Łyżwiarstwo",
	"Jazda na rolkach",
	"Parkour",
	"Street workout",
	"Salsa",
	"Warsztaty plastyczne",
	"DIY (zrób to sam)",
	"Ogrodnictwo",
	"Obserwacja gwiazd",
	"Spacery",
	"Zwiedzanie zamków",
	"Festiwale filmowe",
	"Aktorstwo",
	"Cosplay",
	"Technologia",
	"Konferencje",
	"Networking",
	"Hackathony",
	"Pisanie kreatywne",
	"Rękodzieło",
	"Wspólne zakupy",
	"Gokarty",
	"Rejsy",
	"Warsztaty barmańskie",
	"Imprezy tematyczne",
	"Gry terenowe",
	"Podchody",
	"Zwiedzanie parków narodowych",
	"Survival",
	"Geocaching",
	"Rozwój osobisty",
	"Medytacja",
	"Samorozwój",
	"Konkursy talentów",
	"Eventy startupowe",
	"E-sport",
	"Zwierzęta",
	"Targi",
	"Warsztaty aktorskie",
	"Moda",
	"Tatuaże",
	"Street art",
	"Obserwacja przyrody",
	"Festiwale kultury",
	"Piłka nożna",
	"Spotkania integracyjne",
	"Wyjście na miasto",
	"Zoo",
	"Poznawanie nowych ludzi",
	"Terapie",
	"Szkolenia",
	"Kursy",
	"Programowanie",
	"Projektowanie",
];

export default function CreateEvent({ eventToEdit, onEventCreated, onCancel }) {
	const [image, setImage] = useState(placeholder);
	const [croppedImage, setCroppedImage] = useState(placeholder);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [selectedCategories, setSelectedCategories] = useState([]);
	const [capacity, setCapacity] = useState("");
	const [isUnlimited, setIsUnlimited] = useState(false);
	const [date, setDate] = useState(new Date());
	const [time, setTime] = useState("");
	const [requirements, setRequirements] = useState({});
	const [searchTerm, setSearchTerm] = useState("");
	const [eventName, setEventName] = useState("");
	const [eventDescription, setEventDescription] = useState("");
	const [street, setStreet] = useState("");
	const [city, setCity] = useState("");
	const [ageError, setAgeError] = useState("");
	const [locationError, setLocationError] = useState("");
	const [showOverlay, setShowOverlay] = useState(false);
	const [isEditing, setIsEditing] = useState(!!eventToEdit);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [allowLateJoin, setAllowLateJoin] = useState(false);
	const [customDuration, setCustomDuration] = useState(false);
	const [endDate, setEndDate] = useState(new Date());
	const [endTime, setEndTime] = useState("");
	const [initialDate, setInitialDate] = useState(null);
	const [initialTime, setInitialTime] = useState(null);
	const [isEditMode, setIsEditMode] = useState(!!eventToEdit);
	const [canEditDateTime, setCanEditDateTime] = useState(false);

	const navigate = useNavigate();
	const storage = getStorage();
	const auth = getAuth();
	const user = auth.currentUser ? auth.currentUser.uid : null;
	const [userData, setUserData] = useState(null);

	useEffect(() => {
		const fetchUserData = async () => {
			if (user) {
				const userDoc = await getDoc(doc(db, "users", user));
				if (userDoc.exists()) {
					setUserData(userDoc.data());
				}
			}
		};

		fetchUserData();
	}, [user]);

	useEffect(() => {
		if (eventToEdit) {
			setEventName(eventToEdit.eventName);
			setEventDescription(eventToEdit.eventDescription);
			setSelectedCategories(eventToEdit.selectedCategories);
			setCapacity(
				eventToEdit.capacity === -1
					? ""
					: eventToEdit.capacity.toString()
			);
			setIsUnlimited(eventToEdit.capacity === -1);
			setDate(new Date(eventToEdit.date));
			setTime(eventToEdit.time);
			setInitialDate(new Date(eventToEdit.date));
			setInitialTime(eventToEdit.time);
			setStreet(eventToEdit.street);
			setCity(eventToEdit.city);
			setRequirements(eventToEdit.requirements || {});
			setCroppedImage(eventToEdit.image);
			setCustomDuration(eventToEdit.customDuration);
			setAllowLateJoin(eventToEdit.allowLateJoin);
			if (eventToEdit.endDate) {
				setEndDate(new Date(eventToEdit.endDate));
			}
			if (eventToEdit.endTime) {
				setEndTime(eventToEdit.endTime);
			}
		} else {
			setDate(new Date());
			setTime(format(addHours(new Date(), 1), "HH:mm"));
			setInitialDate(null);
			setInitialTime(null);
		}
	}, [eventToEdit]);

	const uploadImage = async (imageDataUrl) => {
		try {
			let imageUrl = eventToEdit?.image;
			if (imageDataUrl !== eventToEdit?.image) {
				const storage = getStorage();

				if (eventToEdit?.image) {
					try {
						const oldImagePath = eventToEdit.image
							.split("?")[0]
							.split("/o/")[1]
							.replace("%2F", "/");
						const oldImageRef = ref(storage, oldImagePath);
						await deleteObject(oldImageRef);
					} catch (deleteError) {
						console.warn(
							"Nie udało się usunąć starego zdjęcia:",
							deleteError
						);
					}
				}

				const processedImageBlob = await processImage(
					imageDataUrl,
					1920,
					1080
				);
				const storageRef = ref(storage, `images/${Date.now()}.webp`);
				await uploadBytes(storageRef, processedImageBlob);
				imageUrl = await getDownloadURL(storageRef);
			}
			return imageUrl;
		} catch (error) {
			console.error("Nie udało się przetworzyć zdjęcia:", error);
			throw error;
		}
	};

	const onFileChange = (e) => {
		if (e.target.files && e.target.files.length > 0) {
			const reader = new FileReader();
			reader.addEventListener("load", () => {
				setImage(reader.result);
				setIsDialogOpen(true);
			});
			reader.readAsDataURL(e.target.files[0]);
		}
	};

	const onCropComplete = useCallback(
		(croppedArea, croppedAreaPixels) => {
			if (image) {
				const canvas = document.createElement("canvas");
				const img = new Image();
				img.src = image;
				img.onload = () => {
					const scaleX = img.naturalWidth / img.width;
					const scaleY = img.naturalHeight / img.height;
					canvas.width = croppedAreaPixels.width;
					canvas.height = croppedAreaPixels.height;
					const ctx = canvas.getContext("2d");
					if (ctx) {
						ctx.drawImage(
							img,
							croppedAreaPixels.x * scaleX,
							croppedAreaPixels.y * scaleY,
							croppedAreaPixels.width * scaleX,
							croppedAreaPixels.height * scaleY,
							0,
							0,
							croppedAreaPixels.width,
							croppedAreaPixels.height
						);
					}
					setCroppedImage(canvas.toDataURL());
				};
			}
		},
		[image]
	);

	const handleCropConfirm = () => {
		setIsDialogOpen(false);
	};

	const handleCategoryChange = (category) => {
		if (selectedCategories.includes(category)) {
			setSelectedCategories(
				selectedCategories.filter((c) => c !== category)
			);
		} else if (selectedCategories.length < 3) {
			setSelectedCategories([...selectedCategories, category]);
		}
	};

	const handleRequirementChange = (requirement) => {
		setRequirements((prev) => {
			if (requirement === "none") {
				return Object.keys(prev).length === 0 ? { none: true } : {};
			}
			const newRequirements = { ...prev };
			if (requirement in newRequirements) {
				delete newRequirements[requirement];
			} else {
				newRequirements[requirement] = requirement === "age" ? "-" : "";
				delete newRequirements.none;
			}
			return newRequirements;
		});
	};

	const handleRequirementValueChange = (requirement, value) => {
		setRequirements((prev) => ({
			...prev,
			[requirement]: value,
		}));
	};

	const filteredCategories = categories.filter((cat) =>
		cat.toLowerCase().includes(searchTerm.toLowerCase())
	);

	const handleSubmit = async (e) => {
		e.preventDefault();
		if (!user) return;
		if (ageError) return;

		setIsSubmitting(true);

		try {
			let imageUrl = croppedImage;
			if (croppedImage !== eventToEdit?.image) {
				imageUrl = await uploadImage(croppedImage);
			}

			const localDate = new Date(date);
			const [hours, minutes] = time.split(":");
			localDate.setHours(
				parseInt(hours, 10),
				parseInt(minutes, 10),
				0,
				0
			);

			let localEndDate = null;
			if (customDuration && endDate) {
				localEndDate = new Date(endDate);
				const [endHours, endMinutes] = endTime.split(":");
				localEndDate.setHours(
					parseInt(endHours, 10),
					parseInt(endMinutes, 10),
					0,
					0
				);
			} else {
				localEndDate = new Date(localDate);
				localEndDate.setHours(localEndDate.getHours() + 1);
			}

			const eventData = {
				eventName: eventName.trim(),
				eventDescription: eventDescription.trim(),
				selectedCategories,
				capacity: isUnlimited ? -1 : parseInt(capacity, 10),
				date: localDate.toISOString(),
				time,
				endDate: localEndDate.toISOString(),
				endTime: customDuration
					? endTime
					: format(localEndDate, "HH:mm"),
				customDuration,
				allowLateJoin,
				requirements,
				image: imageUrl,
				ended: false,
				lastEditTime: new Date().toISOString(),
			};

			if (isEditMode) {
				if (canEditDateTime) {
					eventData.date = localDate.toISOString();
					eventData.time = time;
				} else {
					delete eventData.date;
					delete eventData.time;
				}
				if (
					street !== eventToEdit.street ||
					city !== eventToEdit.city
				) {
					const address = `${street}, ${city}`;
					const coordinates = await getCoordinates([address]);
					const { lat, lng } = coordinates[address] || {};

					if (!lat || !lng) {
						setLocationError(
							"Nie udało się ustalić lokalizacji wydarzenia. Sprawdź wpisany adres i spróbuj ponownie"
						);
						setIsSubmitting(false);
						return;
					}

					eventData.street = street.trim();
					eventData.city = city.trim();
					eventData.lat = lat;
					eventData.lng = lng;
				} else {
					eventData.street = eventToEdit.street;
					eventData.city = eventToEdit.city;
					eventData.lat = eventToEdit.lat;
					eventData.lng = eventToEdit.lng;
				}

				await updateDoc(doc(db, "events", eventToEdit.id), eventData);
			} else {
				const address = `${street}, ${city}`;
				const coordinates = await getCoordinates([address]);
				const { lat, lng } = coordinates[address] || {};

				if (!lat || !lng) {
					setLocationError(
						"Nie udało się ustalić lokalizacji wydarzenia. Sprawdź wpisany adres i spróbuj ponownie"
					);
					setIsSubmitting(false);
					return;
				}

				eventData.street = street.trim();
				eventData.city = city.trim();
				eventData.lat = lat;
				eventData.lng = lng;
				eventData.creator = user;
				eventData.participants = [user];
				eventData.disliked = 0;
				eventData.liked = 0;
				eventData.reported = 0;

				// Fetch creator name
				const creatorName = await fetchCreatorName(user);
				eventData.creatorName = creatorName;

				const eventRef = await addDoc(
					collection(db, "events"),
					eventData
				);

				const chatData = {
					participants: [
						{
							id: user,
							name: userData?.name || "Nieznany użytkownik",
							profileImage: userData?.profileImage || "",
						},
					],
					messages: [],
				};
				await setDoc(doc(db, "chats", eventRef.id), chatData);
			}

			setIsSubmitting(false);
			setShowOverlay(true);
			if (onEventCreated) {
				onEventCreated(eventData);
			}
		} catch (error) {
			console.error(error);
			setLocationError(
				"Wystąpił błąd podczas tworzenia wydarzenia. Spróbuj ponownie."
			);
			setIsSubmitting(false);
		}
	};

	const handleInputChange = (setter) => (e) => {
		setter(e.target.value.replace(/\s+$/, " "));
	};

	const handleViewMyEvents = () => {
		navigate("/myevents");
	};

	useEffect(() => {
		if (date && time) {
			const eventDateTime = new Date(date);
			const [hours, minutes] = time.split(":");
			eventDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

			if (!customDuration) {
				const endDateTime = new Date(eventDateTime);
				endDateTime.setHours(endDateTime.getHours() + 1);
				setEndDate(endDateTime);
				setEndTime(format(endDateTime, "HH:mm"));
			}
		}
	}, [date, time, customDuration]);

	useEffect(() => {
		if (date && time) {
			const currentTime = new Date();
			const nextHour = addHours(currentTime, 1); // Minimalna godzina od teraz

			const selectedDate = new Date(date);
			const selectedTime = new Date(date);
			const [hours, minutes] = time.split(":");
			selectedTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));

			// Sprawdzenie, czy wybrano datę przyszłą (tylko kolejny dzień, a nie dalsze daty)
			const isTomorrow =
				selectedDate.toDateString() ===
				addDays(currentTime, 1).toDateString();
			if (isTomorrow) {
				const minTimeForTomorrow = new Date(selectedDate);
				minTimeForTomorrow.setHours(
					nextHour.getHours(),
					nextHour.getMinutes()
				);

				// Jeśli wybrany czas dla przyszłego dnia jest wcześniejszy niż minimalny
				if (selectedTime < minTimeForTomorrow) {
					setTime(format(minTimeForTomorrow, "HH:mm")); // Ustaw minimalną godzinę
					setDate(minTimeForTomorrow); // Ustaw również datę na dzień następny
				}
			} else {
				// Jeśli jest obecny dzień, ustal minimalną godzinę na 1 godzinę do przodu
				const minTimeForToday = addHours(currentTime, 1);
				if (selectedTime < minTimeForToday) {
					setTime(format(minTimeForToday, "HH:mm")); // Ustaw minimalną godzinę
				}
			}
		}
	}, [date, time]);

	const handleCustomDurationChange = (checked) => {
		setCustomDuration(checked);
		if (!checked && date && time) {
			const eventDateTime = new Date(date);
			const [hours, minutes] = time.split(":");
			eventDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10));
			const endDateTime = new Date(eventDateTime);
			endDateTime.setHours(endDateTime.getHours() + 1);
			setEndDate(endDateTime);
			setEndTime(format(endDateTime, "HH:mm"));
		}
	};

	return (
		<>
			<form
				onSubmit={handleSubmit}
				className="flex flex-col items-center justify-start min-h-screen bg-background relative"
			>
				<div
					className={`relative w-full max-w-md p-4 space-y-4 overflow-y-auto  ${
						isEditing ? "h-100vh" : "h-[calc(100vh-4rem)]"
					}`}
				>
					{isEditing && (
						<button
							type="button"
							onClick={onCancel}
							className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
						>
							<X className="w-6 h-6" />
						</button>
					)}
					<h1 className="text-2xl font-bold mb-6 text-center">
						{isEditing
							? "Aktualizuj wydarzenie"
							: "Utwórz nowe wydarzenie"}
					</h1>

					<div className="flex flex-col items-center space-y-2">
						<div className="w-full h-48 bg-gray-200 flex items-center justify-center cursor-pointer overflow-hidden rounded-lg">
							<input
								type="file"
								accept="image/*"
								className="hidden"
								id="event-photo"
								onChange={onFileChange}
							/>
							<label
								htmlFor="event-photo"
								className="cursor-pointer w-full h-full flex items-center justify-center"
							>
								<img
									src={croppedImage}
									alt="Event"
									className="w-full h-full object-cover"
								/>
							</label>
						</div>
						<Label htmlFor="event-photo">Zdjęcie wydarzenia</Label>
					</div>

					<div className="space-y-2">
						<Label htmlFor="event-name">Nazwa wydarzenia</Label>
						<Input
							id="event-name"
							placeholder="Wprowadź nazwę wydarzenia"
							required
							value={eventName}
							onChange={handleInputChange(setEventName)}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="event-description">
							Krótki opis (max 200 znaków)
						</Label>
						<Textarea
							id="event-description"
							placeholder="Wprowadź krótki opis"
							maxLength={200}
							required
							value={eventDescription}
							onChange={handleInputChange(setEventDescription)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Kategorie wydarzenia (max 3)</Label>
						<Input
							type="text"
							placeholder="Szukaj kategorii"
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>
						<div className="flex flex-wrap gap-2 mt-2">
							{selectedCategories.map((category) => (
								<Button
									key={category}
									variant="secondary"
									size="sm"
									onClick={() =>
										handleCategoryChange(category)
									}
									className="flex items-center gap-1"
								>
									{category}
									<X className="w-4 h-4" />
								</Button>
							))}
						</div>
						<div className="max-h-40 overflow-y-auto border rounded-md mt-2">
							{filteredCategories.map((category) => (
								<div
									key={category}
									className={`p-2 cursor-pointer  hover:bg-gray-100 ${
										selectedCategories.includes(category)
											? "bg-blue-100"
											: ""
									}`}
									onClick={() =>
										handleCategoryChange(category)
									}
								>
									{category}
								</div>
							))}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="capacity">Liczba miejsc</Label>
						<div className="flex items-center space-x-2">
							<Input
								id="capacity"
								type="number"
								min="2"
								max="100000"
								placeholder="Wprowadź liczbę miejsc"
								value={isUnlimited ? "" : capacity}
								onChange={(e) => setCapacity(e.target.value)}
								className="flex-grow"
								required={!isUnlimited}
								disabled={isUnlimited}
							/>
							<Button
								type="button"
								variant={isUnlimited ? "default" : "outline"}
								onClick={() => {
									setIsUnlimited(!isUnlimited);
									if (!isUnlimited) {
										setCapacity("");
									}
								}}
							>
								<Infinity className="w-6 h-6" />
							</Button>
						</div>
					</div>

					{isEditMode && (
						<div className="space-y-2 mt-4">
							<div className="flex items-center gap-2">
								<Switch
									id="canEditDateTime"
									checked={canEditDateTime}
									onCheckedChange={setCanEditDateTime}
									disabled={
										new Date() >
											new Date(eventToEdit.date) || // Data jest późniejsza
										(new Date().toDateString() ===
											new Date(
												eventToEdit.date
											).toDateString() &&
											new Date(eventToEdit.time) <
												new Date()) // Data jest taka sama, ale czas wcześniejszy
									}
								/>
								<Label htmlFor="canEditDateTime">
									Chcę dostosować terminy wydarzenia (nie
									można edytować czasu wydarzenia, w trakcie
									jego trwania)
								</Label>
							</div>
						</div>
					)}

					<div className="space-y-4">
						<div className="space-y-2">
							<Label>Data rozpoczęcia</Label>
							<Calendar
								mode="single"
								selected={
									isEditMode
										? canEditDateTime
											? date
											: eventToEdit.date
										: date
								}
								onSelect={(newDate) => {
									if (newDate) {
										setDate(newDate);
										if (
											!initialDate ||
											!isToday(initialDate)
										) {
											setTime(
												format(
													addHours(newDate, 1),
													"HH:mm"
												)
											);
										}
									}
								}}
								locale={pl}
								className="rounded-md border w-full"
								required
								disabled={(date) => {
									const now = new Date();
									const nextHour = addHours(now, 1);
									const isInLastHour =
										isToday(date) &&
										isAfter(nextHour, endOfDay(now));

									return (
										(isBefore(date, new Date()) &&
											!isToday(date)) ||
										isInLastHour ||
										(isEditMode && !canEditDateTime)
									);
								}}
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
						<div className="flex items-center justify-between">
							<Label>Godzina rozpoczęcia</Label>
							<Input
								type="time"
								value={
									isEditMode
										? canEditDateTime
											? time
											: eventToEdit.time
										: time
								}
								onChange={(e) => setTime(e.target.value)}
								className="w-auto focus:ring-black focus:border-black"
								min={
									isToday(date) &&
									(!initialDate || !isToday(initialDate))
										? format(
												addHours(new Date(), 1),
												"HH:mm"
										  )
										: undefined
								}
								required
								disabled={isEditMode && !canEditDateTime}
							/>
						</div>
					</div>

					<div className="space-y-2 mt-4">
						<div className="flex items-center gap-4">
							<div className="flex items-center gap-2">
								<Switch
									id="customDuration"
									checked={customDuration}
									onCheckedChange={handleCustomDurationChange}
								/>
							</div>
							<Label htmlFor="customDuration">
								Chcę określić dokładny czas zakończenia
								wydarzenia (jeśli trwa dłużej niż godzinę)
							</Label>
						</div>
					</div>

					{customDuration && (
						<div className="space-y-2 mt-4">
							<Label>Określ datę i czas zakończenia</Label>
							<SingleRowCalendar
								startDate={new Date(date)}
								onSelectDate={setEndDate}
								selectedDate={endDate}
							/>
							<div className="flex items-center justify-between">
								<Label>Wybierz godzinę zakończenia</Label>
								<Input
									type="time"
									value={endTime}
									onChange={(e) => setEndTime(e.target.value)}
									className="w-24 focus:ring-black focus:border-black"
									min={
										endDate.toDateString() ===
										date.toDateString()
											? format(
													addHours(
														parseISO(
															`${
																date
																	.toISOString()
																	.split(
																		"T"
																	)[0]
															}T${time}:00.000Z`
														),
														1
													),
													"HH:mm"
											  )
											: undefined
									}
									required
								/>
							</div>
						</div>
					)}
					<div className="space-y-2 mt-4">
						<div className="flex items-center gap-2">
							<Checkbox
								id="allowLateJoin"
								checked={allowLateJoin}
								onCheckedChange={setAllowLateJoin}
							/>
							<Label htmlFor="allowLateJoin">
								Umożliw dołączenie do wydarzenia po rozpoczęciu
							</Label>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="location">Lokalizacja</Label>
						<Input
							id="street"
							placeholder="Ulica"
							required
							value={street}
							onChange={handleInputChange(setStreet)}
						/>
						<Input
							id="city"
							placeholder="Miasto"
							required
							value={city}
							onChange={handleInputChange(setCity)}
						/>
					</div>

					<div className="space-y-2">
						<Label>Wymagania/kryteria dołączenia</Label>
						<div
							className={`flex flex-wrap  ${
								isEditing ? "gap-1" : "gap-2"
							}`}
						>
							{["none", "age", "gender", "location", "other"].map(
								(req) => (
									<Button
										key={req}
										type="button"
										variant={
											req in requirements
												? "default"
												: "outline"
										}
										onClick={() =>
											handleRequirementChange(req)
										}
										disabled={
											req === "none"
												? false
												: "none" in requirements
										}
									>
										{req === "none"
											? "Brak"
											: req === "age"
											? "Wiek"
											: req === "gender"
											? "Płeć"
											: req === "location"
											? "Lokalizacja"
											: "Inne"}
									</Button>
								)
							)}
						</div>
						{"age" in requirements && (
							<div className="flex flex-col space-y-2">
								<div className="flex space-x-2">
									<Input
										placeholder="Min wiek"
										type="number"
										min="1"
										max="100"
										value={
											requirements.age?.split("-")[0] ||
											""
										}
										onChange={(e) => {
											const minAge = e.target.value;
											const maxAge =
												requirements.age?.split(
													"-"
												)[1] || "";
											if (
												maxAge &&
												parseInt(minAge) >
													parseInt(maxAge)
											) {
												setAgeError(
													"Minimalny wiek nie  może być większy od maksymalnego"
												);
											} else {
												setAgeError("");
											}
											handleRequirementValueChange(
												"age",
												`${minAge}-${maxAge}`
											);
										}}
										required
									/>
									<Input
										placeholder="Max wiek"
										type="number"
										min="1"
										max="100"
										value={
											requirements.age?.split("-")[1] ||
											""
										}
										onChange={(e) => {
											const maxAge = e.target.value;
											const minAge =
												requirements.age?.split(
													"-"
												)[0] || "";
											if (
												parseInt(maxAge) <
												parseInt(minAge)
											) {
												setAgeError(
													"Minimalny wiek nie może być większy od maksymalnego"
												);
											} else {
												setAgeError("");
											}
											handleRequirementValueChange(
												"age",
												`${minAge}-${maxAge}`
											);
										}}
										required
									/>
								</div>
								{ageError && (
									<p className="text-red-500 text-sm">
										{ageError}
									</p>
								)}
							</div>
						)}
						{"gender" in requirements && (
							<Select
								value={requirements.gender}
								onValueChange={(value) =>
									handleRequirementValueChange(
										"gender",
										value
									)
								}
								required
							>
								<SelectTrigger>
									<SelectValue placeholder="Wybierz płeć" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Kobieta">
										Kobieta
									</SelectItem>
									<SelectItem value="Mężczyzna">
										Mężczyzna
									</SelectItem>
									<SelectItem value="Niestandardowa">
										Niestandardowa
									</SelectItem>
								</SelectContent>
							</Select>
						)}
						{"location" in requirements && (
							<Input
								placeholder="Wymagana lokalizacja"
								value={requirements.location}
								onChange={(e) =>
									handleRequirementValueChange(
										"location",
										e.target.value
									)
								}
								required
							/>
						)}
						{"other" in requirements && (
							<Input
								placeholder="Inne wymagania"
								value={requirements.other}
								onChange={(e) =>
									handleRequirementValueChange(
										"other",
										e.target.value
									)
								}
								required
							/>
						)}
					</div>
					{locationError && (
						<div className="text-red-500 text-sm mt-2">
							{locationError}
						</div>
					)}
					<div className="flex gap-4 mt-6">
						<Button
							type="submit"
							className="w-full"
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<>
									<span className="mr-2">
										{isEditing
											? "Aktualizowanie..."
											: "Tworzenie..."}
									</span>
									<svg
										className="animate-spin h-5 w-5 text-white"
										xmlns="http://www.w3.org/2000/svg"
										fill="none"
										viewBox="0 0 24 24"
									>
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
										></circle>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										></path>
									</svg>
								</>
							) : isEditing ? (
								"Aktualizuj wydarzenie"
							) : (
								"Utwórz wydarzenie"
							)}
						</Button>
					</div>
				</div>
			</form>
			{showOverlay && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50"
				>
					<motion.div
						initial={{ scale: 0.5, opacity: 0 }}
						animate={{ scale: 1, opacity: 1 }}
						exit={{ scale: 0.5, opacity: 0 }}
						transition={{ duration: 0.5 }}
						className="w-80 h-64 mb-2"
					>
						<Lottie
							animationData={animationData}
							loop={false}
							autoplay={true}
						/>
					</motion.div>
					<motion.h2
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 20, opacity: 0 }}
						className="text-2xl font-bold text-gray-800 mb-8"
					>
						Wydarzenie zostało{" "}
						{isEditing ? "zaktualizowane" : "utworzone"}!
					</motion.h2>
					<motion.div
						initial={{ y: 20, opacity: 0 }}
						animate={{ y: 0, opacity: 1 }}
						exit={{ y: 20, opacity: 0 }}
						className="absolute bottom-8 left-0 right-0 flex justify-center"
					>
						<Button
							onClick={handleViewMyEvents}
							className="rounded-full px-12 py-6 text-lg"
						>
							Zobacz moje wydarzenia
						</Button>
					</motion.div>
				</motion.div>
			)}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Wykadruj zdjęcie</DialogTitle>
					</DialogHeader>
					<div className="relative w-full h-64">
						{image && (
							<Cropper
								image={image}
								crop={crop}
								zoom={zoom}
								aspect={16 / 9}
								onCropChange={setCrop}
								onCropComplete={onCropComplete}
								onZoomChange={setZoom}
							/>
						)}
					</div>
					<Button onClick={handleCropConfirm}>Zatwierdź</Button>
				</DialogContent>
			</Dialog>
		</>
	);
}
