"use client";

import { useState, useCallback, FormEvent } from "react";
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
	const { name, email } = location.state || {};

	const [error, setError] = useState("");
	const [selectedInterests, setSelectedInterests] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [image, setImage] = useState(null);
	const [croppedImage, setCroppedImage] = useState(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [activeTab, setActiveTab] = useState("person");
	const [formData, setFormData] = useState({
		name: name || "",
		age: "",
		gender: "",
		location: "",
		description: "",
		orgName: "",
		orgLocation: "",
		orgDescription: "",
	});
	const storage = getStorage();
	const auth = getAuth();
	const user = auth.currentUser ? auth.currentUser.uid : null;

	const uploadImage = async (imageDataUrl) => {
		const response = await fetch(imageDataUrl);
		const blob = await response.blob();
		const storageRef = ref(storage, `images/${Date.now()}.jpg`);
		await uploadBytes(storageRef, blob);
		const url = await getDownloadURL(storageRef);
		return url;
	};

	const handleInterestChange = (interest) => {
		if (selectedInterests.includes(interest)) {
			setSelectedInterests(
				selectedInterests.filter((i) => i !== interest)
			);
		} else if (selectedInterests.length < 10) {
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
		if (activeTab === "person") {
			if (
				!formData.name ||
				!formData.age ||
				!formData.gender ||
				!formData.location ||
				!formData.description
			) {
				setError("Proszę wypełnić wszystkie pola dla osoby.");
				return;
			}
		} else {
			if (
				!formData.orgName ||
				!formData.orgLocation ||
				!formData.orgDescription
			) {
				setError("Proszę wypełnić wszystkie pola dla organizacji.");
				return;
			}
		}
		if (!croppedImage) {
			setError("Proszę dodać zdjęcie profilowe.");
			return;
		}
		if (selectedInterests.length === 0) {
			setError("Proszę wybrać co najmniej jedno zainteresowanie.");
			return;
		}

		const userData = {
			...formData,
			interests: selectedInterests,
			uid: user,
		};

		try {
			const userDocRef = await addDoc(collection(db, "users"), userData);
			const imageUrl = await uploadImage(croppedImage);
			await setDoc(doc(db, "users", userDocRef.id), {
				...userData,
				profileImage: imageUrl,
			});

			setTimeout(() => {
				navigate(`/profile/${user}`);
			}, 5000);
		} catch (error) {
			console.error("Error:", error);
		}
	};

	return (
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
				}}
				className="w-full max-w-md"
			>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="person">Osoba</TabsTrigger>
					<TabsTrigger value="organization">Organizacja</TabsTrigger>
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
								<SelectItem value="kobieta">Kobieta</SelectItem>
								<SelectItem value="mężczyzna">
									Mężczyzna
								</SelectItem>
								<SelectItem value="inne">
									Niestandardowa
								</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="location">Lokalizacja</Label>
						<Input
							id="location"
							name="location"
							placeholder="Wprowadź lokalizację"
							value={formData.location}
							onChange={handleInputChange}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="description">
							Krótki opis (max 200 znaków)
						</Label>
						<Textarea
							id="description"
							name="description"
							placeholder="Wprowadź krótki opis"
							maxLength={200}
							value={formData.description}
							onChange={handleInputChange}
							required
						/>
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
						<Label htmlFor="org-name">Nazwa organizacji</Label>
						<Input
							id="org-name"
							name="orgName"
							placeholder="Wprowadź nazwę organizacji"
							value={formData.orgName}
							onChange={handleInputChange}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="org-location">Lokalizacja</Label>
						<Input
							id="org-location"
							name="orgLocation"
							placeholder="Wprowadź lokalizację"
							value={formData.orgLocation}
							onChange={handleInputChange}
							required
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="org-description">
							Krótki opis (max 200 znaków)
						</Label>
						<Textarea
							id="org-description"
							name="orgDescription"
							placeholder="Wprowadź krótki opis"
							maxLength={200}
							value={formData.orgDescription}
							onChange={handleInputChange}
							required
						/>
					</div>
				</TabsContent>

				<div className="space-y-2 mt-4">
					<Label>Zainteresowania (max 10)</Label>
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
								onClick={() => handleInterestChange(interest)}
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
								onClick={() => handleInterestChange(interest)}
							>
								{interest}
							</div>
						))}
					</div>
				</div>
				{error && <p className="text-red-500 pt-5">{error}</p>}
				<Button type="submit" className="w-full mt-6">
					Utwórz profil
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
	);
}