"use client";

import { useState, useCallback, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { db } from "../firebaseConfig";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, X } from "lucide-react";
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
import { getAuth } from "firebase/auth";
import { processImage } from "@/lib/process-image";
import { getUserLocation, getCoordinates } from "@/lib/event-functions";
import Lottie from "lottie-react";
import animationData from "../assets/animation-userCreation.json";
import locationAnimationData from "../assets/animation-location.json";
import { motion, AnimatePresence } from "framer-motion";

const interests = [
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

export default function UserCreator() {
	const navigate = useNavigate();
	const location = useLocation();
	const { name } = location.state || {};

	const [error, setError] = useState("");
	const [selectedInterests, setSelectedInterests] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [image, setImage] = useState(null);
	const [croppedImage, setCroppedImage] = useState(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("person");
	const [userLocation, setUserLocation] = useState(null);
	const [coordinates, setCoordinates] = useState(null);
	const [locationError, setLocationError] = useState("");
	const [showLocationPopup, setShowLocationPopup] = useState(true);
	const [locationPermissionGranted, setLocationPermissionGranted] =
		useState(false);
	const [formData, setFormData] = useState({
		name: name || "",
		age: "",
		gender: "",
		street: "",
		city: "",
		description: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showOverlay, setShowOverlay] = useState(false);
	const storage = getStorage();
	const auth = getAuth();
	const user = auth.currentUser ? auth.currentUser.uid : null;
	const defaultProfileImage =
		"https://firebasestorage.googleapis.com/v0/b/eventapp-1b046.appspot.com/o/static%2F1731795031624.webp?alt=media&token=23aed4ef-38ac-41a9-a3dc-8b3ccbf39392";

	useEffect(() => {
		checkLocationPermission();
	}, []);

	const checkLocationPermission = () => {
		//zastepczna funkcja
		if ("geolocation" in navigator) {
			navigator.permissions
				.query({ name: "geolocation" })
				.then((result) => {
					if (result.state === "granted") {
						setLocationPermissionGranted(true);
						setShowLocationPopup(false);
					} else {
						setLocationPermissionGranted(false);
						setShowLocationPopup(true);
					}
				});
		} else {
			setLocationError("Błąd lokalizacji.");
			setShowLocationPopup(true);
		}
	};

	useEffect(() => {
		if (activeTab === "person" && locationPermissionGranted) {
			fetchUserLocation();
		}
	}, [activeTab, locationPermissionGranted]);

	const handleEnableLocation = async () => {
		try {
			const position = await new Promise((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject);
			});
			setLocationPermissionGranted(true);
			setShowLocationPopup(false);
			fetchUserLocation();
		} catch (error) {
			console.error("Błąd lokalizacji:", error);
			if (error.code === 1) {
				setLocationError(
					"Odmówiono dostępu do lokalizacji. Aby korzystać z funkcji lokalizacji, zmień ustawienia przeglądarki i spróbuj ponownie."
				);
			} else {
				setLocationError(
					"Wystąpił błąd podczas uzyskiwania dostępu do lokalizacji. Spróbuj ponownie później."
				);
			}
		}
	};

	const fetchUserLocation = async () => {
		const location = await getUserLocation();
		if (location) {
			setUserLocation(location);
			setFormData((prevData) => ({
				...prevData,
				street: location.street,
				city: location.city,
			}));
		}
	};

	const fetchCoordinates = async (address) => {
		const coords = await getCoordinates([address]);
		if (coords && coords[address]) {
			return coords[address];
		}
		return null;
	};

	const uploadImage = async (imageDataUrl) => {
		if (!imageDataUrl) {
			return defaultProfileImage;
		}
		try {
			const processedImageBlob = await processImage(
				imageDataUrl,
				200,
				200
			);
			const storageRef = ref(storage, `images/${Date.now()}.webp`);
			await uploadBytes(storageRef, processedImageBlob);
			const url = await getDownloadURL(storageRef);
			return url;
		} catch (error) {
			console.error(
				"Error przetwarzania lub przesyłania zdjęcia:",
				error
			);
			return defaultProfileImage;
		}
	};

	const handleInterestChange = (interest) => {
		const maxInterests = activeTab === "person" ? 10 : 3;
		if (selectedInterests.includes(interest)) {
			setSelectedInterests(
				selectedInterests.filter((i) => i !== interest)
			);
		} else if (selectedInterests.length < maxInterests) {
			setSelectedInterests([...selectedInterests, interest]);
		}
	};

	const filteredInterests = interests.filter((interest) =>
		interest.toLowerCase().includes(searchTerm.toLowerCase())
	);

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

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setFormData((prevData) => ({
			...prevData,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsSubmitting(true);
		if (isSubmitting) return;

		if (activeTab === "person") {
			if (
				!formData.name ||
				!formData.age ||
				!formData.gender ||
				!formData.description
			) {
				setError("Proszę wypełnić wszystkie pola dla osoby.");
				setIsSubmitting(false);
				return;
			}
		} else {
			if (
				!formData.name ||
				!formData.street ||
				!formData.city ||
				!formData.description
			) {
				setError("Proszę wypełnić wszystkie pola dla organizacji.");
				setIsSubmitting(false);
				return;
			}
		}
		if (selectedInterests.length === 0) {
			setError("Proszę wybrać co najmniej jedno zainteresowanie.");
			setIsSubmitting(false);
			return;
		}

		setError("");

		let coords = null;
		if (activeTab === "organization") {
			const address = `${formData.street}, ${formData.city}`;
			coords = await fetchCoordinates(address);
			if (!coords) {
				setError(
					"Nie udało się ustalić lokalizacji. Sprawdź wpisany adres i spróbuj ponownie"
				);
				setIsSubmitting(false);
				return;
			}
		}

		const preferences = {
			interests: selectedInterests,
			location: formData.city,
			meetRequirements: true,
			usePersonLimit: false,
			personLimit: null,
			distance: 10,
			locationEnabled: locationPermissionGranted,
		};

		let userData = {
			...formData,
			interests: selectedInterests,
			uid: user,
			preferences,
			type: activeTab,
		};

		if (activeTab === "person") {
			userData = {
				...userData,
				lat: userLocation?.lat,
				lng: userLocation?.lng,
			};
		} else if (activeTab === "organization") {
			userData = {
				...userData,
				lat: coords.lat,
				lng: coords.lng,
			};
		}

		try {
			const userDocRef = await addDoc(collection(db, "users"), userData);
			const imageUrl = await uploadImage(croppedImage);
			await setDoc(doc(db, "users", userDocRef.id), {
				...userData,
				profileImage: imageUrl,
			});

			setShowOverlay(true);
		} catch (error) {
			console.error(error);
			setError(
				"Wystąpił błąd podczas tworzenia profilu. Spróbuj ponownie."
			);
		}
		setIsSubmitting(false);
	};

	const handleViewProfile = () => {
		navigate(`/profile/${user}`);
		window.location.reload();
	};

	return (
		<>
			<form
				onSubmit={handleSubmit}
				className="flex flex-col items-center justify-start min-h-screen bg-background p-4"
			>
				<h1 className="text-2xl font-bold mb-6">Kreator użytkownika</h1>

				<Tabs
					value={activeTab}
					onValueChange={(value) => {
						setActiveTab(value);
						setError("");
						setSelectedInterests([]);
					}}
					className="w-full max-w-md"
				>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="person">Osoba</TabsTrigger>
						<TabsTrigger value="organization">
							Organizacja
						</TabsTrigger>
					</TabsList>

					<TabsContent value="person" className="space-y-4">
						<div className="flex flex-col items-center space-y-2">
							<div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer overflow-hidden">
								<input
									type="file"
									accept="image/*"
									className="hidden"
									id="person-photo"
									onChange={onFileChange}
								/>
								<label
									htmlFor="person-photo"
									className="cursor-pointer w-full h-full flex items-center justify-center"
								>
									{croppedImage ? (
										<img
											src={croppedImage}
											alt="Avatar"
											className="w-full h-full object-cover"
										/>
									) : (
										<Plus className="w-10 h-10 text-gray-400" />
									)}
								</label>
							</div>
							<Label htmlFor="person-photo">Zdjęcie</Label>
						</div>

						<div className="space-y-2">
							<Label htmlFor="name">Imię</Label>
							<Input
								id="name"
								name="name"
								placeholder="Wprowadź imię"
								value={formData.name}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="age">Wiek</Label>
							<Input
								id="age"
								name="age"
								type="number"
								placeholder="Wprowadź wiek"
								value={formData.age}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="gender">Płeć</Label>
							<Select
								name="gender"
								onValueChange={(value) =>
									setFormData((prev) => ({
										...prev,
										gender: value,
									}))
								}
								value={formData.gender}
								required
							>
								<SelectTrigger id="gender">
									<SelectValue placeholder="Wybierz płeć" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="Kobieta">
										Kobieta
									</SelectItem>
									<SelectItem value="Mężczyzna">
										Mężczyzna
									</SelectItem>
									<SelectItem value="Inne">
										Niestandardowa
									</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">
								Krótki opis (max 400 znaków)
							</Label>
							<Textarea
								id="description"
								name="description"
								placeholder="Wprowadź krótki opis"
								maxLength={400}
								value={formData.description}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div className="space-y-2 mt-4">
							<Label>Wybierz zainteresowania (max 10)</Label>
							<Input
								type="text"
								placeholder="Szukaj zainteresowań"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
							<div className="flex flex-wrap gap-2 mt-2">
								{selectedInterests.map((interest) => (
									<Button
										key={interest}
										variant="secondary"
										size="sm"
										onClick={() =>
											handleInterestChange(interest)
										}
										className="flex items-center gap-1"
									>
										{interest}
										<X className="w-4 h-4" />
									</Button>
								))}
							</div>
							<div className="max-h-40 overflow-y-auto border rounded-md mt-2">
								{filteredInterests.map((interest) => (
									<div
										key={interest}
										className={`p-2 cursor-pointer hover:bg-gray-100 ${
											selectedInterests.includes(interest)
												? "bg-blue-100"
												: ""
										}`}
										onClick={() =>
											handleInterestChange(interest)
										}
									>
										{interest}
									</div>
								))}
							</div>
						</div>
					</TabsContent>

					<TabsContent value="organization" className="space-y-4">
						<div className="flex flex-col items-center space-y-2">
							<div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer overflow-hidden">
								<input
									type="file"
									accept="image/*"
									className="hidden"
									id="org-photo"
									onChange={onFileChange}
								/>
								<label
									htmlFor="org-photo"
									className="cursor-pointer w-full h-full flex items-center justify-center"
								>
									{croppedImage ? (
										<img
											src={croppedImage}
											alt="Avatar"
											className="w-full h-full object-cover"
										/>
									) : (
										<Plus className="w-10 h-10 text-gray-400" />
									)}
								</label>
							</div>
							<Label htmlFor="org-photo">Zdjęcie</Label>
						</div>
						<div className="space-y-2">
							<Label htmlFor="name">Nazwa organizacji</Label>
							<Input
								id="name"
								name="name"
								placeholder="Wprowadź nazwę organizacji"
								value={formData.name}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="street">Ulica</Label>
							<Input
								id="street"
								name="street"
								placeholder="Wprowadź ulicę"
								value={formData.street}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="city">Miasto</Label>
							<Input
								id="city"
								name="city"
								placeholder="Wprowadź miasto"
								value={formData.city}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description">
								Krótki opis (max 400 znaków)
							</Label>
							<Textarea
								id="description"
								name="description"
								placeholder="Wprowadź krótki opis"
								maxLength={400}
								value={formData.description}
								onChange={handleInputChange}
								required
							/>
						</div>
						<div className="space-y-2 mt-4">
							<Label>Wybierz kategorię (max 3)</Label>
							<Input
								type="text"
								placeholder="Szukaj zainteresowań"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
							<div className="flex flex-wrap gap-2 mt-2">
								{selectedInterests.map((interest) => (
									<Button
										key={interest}
										variant="secondary"
										size="sm"
										onClick={() =>
											handleInterestChange(interest)
										}
										className="flex items-center gap-1"
									>
										{interest}
										<X className="w-4 h-4" />
									</Button>
								))}
							</div>
							<div className="max-h-40 overflow-y-auto border rounded-md mt-2">
								{filteredInterests.map((interest) => (
									<div
										key={interest}
										className={`p-2 cursor-pointer hover:bg-gray-100 ${
											selectedInterests.includes(interest)
												? "bg-blue-100"
												: ""
										}`}
										onClick={() =>
											handleInterestChange(interest)
										}
									>
										{interest}
									</div>
								))}
							</div>
						</div>
					</TabsContent>

					{error && <p className="text-red-500 pt-5">{error}</p>}
					<Button
						type="submit"
						className="w-full mt-6"
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<svg
									className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
								Tworzenie profilu...
							</>
						) : (
							"Utwórz profil"
						)}
					</Button>
				</Tabs>

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
									aspect={1}
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
			<AnimatePresence>
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
							className="w-64 h-64 mb-2"
						>
							<Lottie
								animationData={animationData}
								loop={false}
								autoplay={showOverlay}
							/>
						</motion.div>
						<motion.h2
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							exit={{ y: 20, opacity: 0 }}
							className="text-2xl font-bold text-gray-800 mb-8"
						>
							Profil został utworzony!
						</motion.h2>
						<motion.div
							initial={{ y: 20, opacity: 0 }}
							animate={{ y: 0, opacity: 1 }}
							exit={{ y: 20, opacity: 0 }}
							className="absolute bottom-8 left-0 right-0 flex justify-center"
						>
							<Button
								onClick={handleViewProfile}
								className="rounded-full px-12 py-6 text-lg"
							>
								Zobacz profil
							</Button>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{showLocationPopup && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-between p-6"
					>
						<div className="flex-1 flex flex-col items-center justify-center w-full max-w-md">
							<div className="w-48 h-48 mb-4">
								<Lottie
									animationData={locationAnimationData}
									loop={true}
									autoplay={true}
								/>
							</div>
							<h2 className="text-2xl font-bold mb-4 text-center">
								Gdzie jesteś?
							</h2>
							<p className="text-center mb-8">
								Aby w pełni wykorzystać możliwości aplikacji,
								potrzebujemy dostępu do Twojej lokalizacji.
								Dzięki temu możemy precyzyjnie dopasowywać
								wydarzenia w Twojej okolicy, zapewniając Ci jak
								najlepsze doświadczenie. Po rejestracji możesz
								wyłączyć udostępnianie lokalizacji, jednak
								wówczas nie będziemy mogli jej aktualizować.
							</p>
							{locationError && (
								<p className="text-red-500 text-center mb-4">
									{locationError}
								</p>
							)}
						</div>
						<Button
							onClick={handleEnableLocation}
							className="rounded-full px-12 py-6 text-lg"
						>
							Włącz lokalizację
						</Button>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
