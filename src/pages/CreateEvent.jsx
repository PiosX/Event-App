"use client";

import { useState, useCallback } from "react";
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
	query,
	where,
	getDocs,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { processImage } from "@/lib/process-image";

const categories = [
	"Podróże",
	"Zwiedzanie",
	"Wędrówki",
	"Camping",
	"Festiwale",
	"Koncerty",
	"Imprezy",
	// ... (rest of the categories array)
];

export default function CreateEvent({ onEventCreated }) {
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
	const navigate = useNavigate();
	const storage = getStorage();
	const auth = getAuth();
	const user = auth.currentUser ? auth.currentUser.uid : null;

	const uploadImage = async (imageDataUrl) => {
		try {
			const processedImageBlob = await processImage(
				imageDataUrl,
				1920,
				1080
			);
			const storageRef = ref(storage, `images/${Date.now()}.webp`);
			await uploadBytes(storageRef, processedImageBlob);
			const url = await getDownloadURL(storageRef);
			return url;
		} catch (error) {
			console.error("Error processing or uploading image:", error);
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
		if (!user) {
			return;
		}

		if (ageError) {
			return;
		}

		try {
			const imageUrl = await uploadImage(croppedImage);

			const usersRef = collection(db, "users");
			const userQuery = query(usersRef, where("uid", "==", user));
			const userDocs = await getDocs(userQuery);

			let participantData;
			if (!userDocs.empty) {
				const userDoc = userDocs.docs[0];
				const userData = userDoc.data();
				participantData = {
					id: user,
					name: userData.name,
					profileImage: userData.profileImage,
				};
			} else {
				console.error("User not found in users collection.");
				return;
			}

			const eventData = {
				eventName: eventName.trim().replace(/\s+$/, " "),
				eventDescription: eventDescription.trim().replace(/\s+$/, " "),
				selectedCategories,
				capacity: isUnlimited ? -1 : parseInt(capacity, 10),
				date: date.toISOString(),
				time,
				street: street.trim().replace(/\s+$/, " "),
				city: city.trim().replace(/\s+$/, " "),
				requirements,
				image: imageUrl,
				creator: user,
				participants: [user],
			};

			const eventRef = await addDoc(collection(db, "events"), eventData);

			const chatData = {
				participants: [participantData],
				messages: [],
			};
			await setDoc(doc(db, "chats", eventRef.id), chatData);

			navigate(`/myevents`);
			if (onEventCreated) {
				onEventCreated(eventData);
			}
		} catch (error) {
			console.error(error);
		}
	};

	const handleInputChange = (setter) => (e) => {
		setter(e.target.value.replace(/\s+$/, " "));
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col items-center justify-start min-h-screen bg-background"
		>
			<div className="w-full max-w-md p-4 space-y-4 overflow-y-auto h-[calc(100vh-4rem)]">
				<h1 className="text-2xl font-bold mb-6 text-center">
					Utwórz nowe wydarzenie
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
								onClick={() => handleCategoryChange(category)}
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
								className={`p-2 cursor-pointer hover:bg-gray-100 ${
									selectedCategories.includes(category)
										? "bg-blue-100"
										: ""
								}`}
								onClick={() => handleCategoryChange(category)}
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

				<div className="space-y-2">
					<Label>Data i godzina rozpoczęcia</Label>
					<div className="flex space-x-2">
						<div className="flex-grow">
							<Calendar
								mode="single"
								selected={date}
								onSelect={setDate}
								locale={pl}
								className="rounded-md border"
								required
							/>
						</div>
						<Input
							type="time"
							value={time}
							onChange={(e) => setTime(e.target.value)}
							className="w-24 focus:ring-black  focus:border-black"
							required
						/>
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
					<div className="flex flex-wrap gap-2">
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
									onClick={() => handleRequirementChange(req)}
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
									value={
										requirements.age?.split("-")[0] || ""
									}
									onChange={(e) => {
										const minAge = e.target.value;
										const maxAge =
											requirements.age?.split("-")[1] ||
											"";
										if (
											maxAge &&
											parseInt(minAge) > parseInt(maxAge)
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
									value={
										requirements.age?.split("-")[1] || ""
									}
									onChange={(e) => {
										const maxAge = e.target.value;
										const minAge =
											requirements.age?.split("-")[0] ||
											"";
										if (
											parseInt(maxAge) < parseInt(minAge)
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
								handleRequirementValueChange("gender", value)
							}
							required
						>
							<SelectTrigger>
								<SelectValue placeholder="Wybierz płeć" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Kobieta">Kobieta</SelectItem>
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

				<Button type="submit" className="w-full mt-6">
					Utwórz wydarzenie
				</Button>
			</div>

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
		</form>
	);
}
