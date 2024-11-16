"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db, auth } from "../firebaseConfig";
import { useEffect, useState, useCallback } from "react";
import {
	collection,
	query,
	where,
	getDocs,
	doc,
	updateDoc,
} from "firebase/firestore";
import { Edit, Plus, X } from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import {
	getStorage,
	ref,
	deleteObject,
	uploadBytes,
	getDownloadURL,
} from "firebase/storage";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import Cropper from "react-easy-crop";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import TopNavBar from "@/components/ui/TopNavBar";
import ProfileDialogs from "@/components/ui/ProfileDialogs";
import { processImage } from "@/lib/process-image";

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

export default function UserProfile() {
	const { userId } = useParams();
	const navigate = useNavigate();
	const [userData, setUserData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isEditMode, setIsEditMode] = useState(false);
	const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

	const [editFormData, setEditFormData] = useState({
		name: "",
		age: "",
		gender: "",
		street: "",
		city: "",
		description: "",
	});
	const [selectedInterests, setSelectedInterests] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [image, setImage] = useState(null);
	const [croppedImage, setCroppedImage] = useState(null);
	const [crop, setCrop] = useState({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [isDialogOpen, setIsDialogOpen] = useState(false);

	useEffect(() => {
		const fetchUserData = async () => {
			if (userId) {
				setLoading(true);
				//sprawdzanie local storage na początku
				const cachedUserData = localStorage.getItem(
					`userData_${userId}`
				);
				if (cachedUserData) {
					const parsedUserData = JSON.parse(cachedUserData);
					setUserData(parsedUserData);
					setEditFormData({
						name: parsedUserData.name || "",
						age: parsedUserData.age || "",
						gender: parsedUserData.gender || "",
						street: parsedUserData.street || "",
						city: parsedUserData.city || "",
						description: parsedUserData.description || "",
					});
					setSelectedInterests(parsedUserData.interests || []);
					setLoading(false);
					return;
				}

				// jeśli nie ma w local storage pobieramy z bazy
				const q = query(
					collection(db, "users"),
					where("uid", "==", userId)
				);
				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					querySnapshot.forEach((doc) => {
						const data = doc.data();
						setUserData(data);
						setEditFormData({
							name: data.name || "",
							age: data.age || "",
							gender: data.gender || "",
							street: data.street || "",
							city: data.city || "",
							description: data.description || "",
						});
						setSelectedInterests(data.interests || []);

						localStorage.setItem(
							`userData_${userId}`,
							JSON.stringify(data)
						);
					});
				} else {
					navigate(`/profile/${currentUserId}`);
				}
				setLoading(false);
			}
		};

		fetchUserData();
	}, [userId, currentUserId, navigate]);

	const handleInterestChange = (interest) => {
		const maxInterests = userData?.age && userData?.gender ? 10 : 3;
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

	const handleCropConfirm = async () => {
		if (croppedImage) {
			try {
				const processedImageBlob = await processImage(
					croppedImage,
					200,
					200
				);
				const processedImageUrl =
					URL.createObjectURL(processedImageBlob);
				setCroppedImage(processedImageUrl);
			} catch (error) {
				console.error("Błąd przetwarzania zdjęcia:", error);
			}
		}
		setIsDialogOpen(false);
	};

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		setEditFormData((prevData) => ({
			...prevData,
			[name]: value,
		}));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setLoading(true);

		try {
			let imageUrl = userData.profileImage;
			if (croppedImage) {
				const storage = getStorage();

				//usuwamy stare zdjęcie jeśli istnieje
				if (userData.profileImage) {
					try {
						const oldImagePath = userData.profileImage
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

				const storageRef = ref(storage, `images/${Date.now()}.webp`);
				const processedImageBlob = await processImage(
					croppedImage,
					200,
					200
				);
				await uploadBytes(storageRef, processedImageBlob);
				imageUrl = await getDownloadURL(storageRef);
			}

			const updatedUserData = {
				...userData,
				...editFormData,
				interests: selectedInterests,
				profileImage: imageUrl,
			};

			const userQuery = query(
				collection(db, "users"),
				where("uid", "==", currentUserId)
			);
			const querySnapshot = await getDocs(userQuery);

			if (!querySnapshot.empty) {
				const userDoc = querySnapshot.docs[0];
				await updateDoc(doc(db, "users", userDoc.id), updatedUserData);

				localStorage.setItem(
					`userData_${currentUserId}`,
					JSON.stringify(updatedUserData)
				);

				setUserData(updatedUserData);
				setIsEditMode(false);
			} else {
				throw new Error("User document not found");
			}
		} catch (error) {
			console.error("Błąd aktualizacji profilu:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col h-screen bg-background">
			<TopNavBar onSettingsClick={() => setIsSettingsOpen(true)} />

			<main className="flex-grow overflow-y-auto pb-20">
				<div className="container max-w-xl mx-auto px-4 py-8">
					<div className="flex flex-col items-center space-y-4">
						{currentUserId === userId && (
							<Button
								variant="outline"
								size="sm"
								className="mb-4"
								onClick={() => setIsEditMode(!isEditMode)}
							>
								<Edit className="w-4 h-4 mr-2" />
								{isEditMode ? "Anuluj edycję" : "Edytuj profil"}
							</Button>
						)}

						{loading ? (
							<div className="absolute inset-0 flex items-center justify-center">
								Ładowanie...
							</div>
						) : isEditMode ? (
							<form
								onSubmit={handleSubmit}
								className="w-full space-y-4"
							>
								<div className="flex flex-col items-center space-y-2">
									<div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center cursor-pointer overflow-hidden">
										<input
											type="file"
											accept="image/*"
											className="hidden"
											id="profile-photo"
											onChange={onFileChange}
										/>
										<label
											htmlFor="profile-photo"
											className="cursor-pointer w-full h-full flex items-center justify-center"
										>
											{croppedImage ||
											userData.profileImage ? (
												<img
													src={
														croppedImage ||
														userData.profileImage
													}
													alt="Avatar"
													className="w-full h-full object-cover"
												/>
											) : (
												<Plus className="w-10 h-10 text-gray-400" />
											)}
										</label>
									</div>
									<Label htmlFor="profile-photo">
										Zdjęcie
									</Label>
								</div>
								<div className="space-y-2">
									<Label htmlFor="name">
										{userData.age && userData.gender
											? "Imię"
											: "Nazwa"}
									</Label>
									<Input
										id="name"
										name="name"
										placeholder={`Wprowadź ${
											userData.age && userData.gender
												? "imię"
												: "nazwę"
										}`}
										value={editFormData.name}
										onChange={handleInputChange}
										required
									/>
								</div>
								{userData.age && userData.gender && (
									<>
										<div className="space-y-2">
											<Label htmlFor="age">Wiek</Label>
											<Input
												id="age"
												name="age"
												type="number"
												placeholder="Wprowadź wiek"
												value={editFormData.age}
												onChange={handleInputChange}
												required
											/>
										</div>
										<div className="space-y-2">
											<Label htmlFor="gender">Płeć</Label>
											<Select
												name="gender"
												onValueChange={(value) =>
													setEditFormData((prev) => ({
														...prev,
														gender: value,
													}))
												}
												value={editFormData.gender}
												required
											>
												<SelectTrigger id="gender">
													<SelectValue placeholder="Wybierz płeć" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="kobieta">
														Kobieta
													</SelectItem>
													<SelectItem value="mężczyzna">
														Mężczyzna
													</SelectItem>
													<SelectItem value="inne">
														Niestandardowa
													</SelectItem>
												</SelectContent>
											</Select>
										</div>
									</>
								)}
								{!userData.age && !userData.gender && (
									<>
										<div className="space-y-2">
											<Label htmlFor="street">
												Ulica
											</Label>
											<Input
												id="street"
												name="street"
												placeholder="Wprowadź ulicę"
												value={editFormData.street}
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
												value={editFormData.city}
												onChange={handleInputChange}
												required
											/>
										</div>
									</>
								)}
								<div className="space-y-2">
									<Label htmlFor="description">
										Krótki opis (max 400 znaków)
									</Label>
									<Textarea
										id="description"
										name="description"
										placeholder="Wprowadź krótki opis"
										maxLength={400}
										value={editFormData.description}
										onChange={handleInputChange}
										required
									/>
								</div>
								<div className="space-y-2 mt-4">
									<Label>
										{userData.age && userData.gender
											? "Wybierz zainteresowania (max 10)"
											: "Wybierz kategorię (max 3)"}
									</Label>
									<Input
										type="text"
										placeholder="Szukaj zainteresowań"
										value={searchTerm}
										onChange={(e) =>
											setSearchTerm(e.target.value)
										}
									/>
									<div className="flex flex-wrap gap-2 mt-2">
										{selectedInterests.map((interest) => (
											<Button
												key={interest}
												variant="secondary"
												size="sm"
												onClick={() =>
													handleInterestChange(
														interest
													)
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
													selectedInterests.includes(
														interest
													)
														? "bg-blue-100"
														: ""
												}`}
												onClick={() =>
													handleInterestChange(
														interest
													)
												}
											>
												{interest}
											</div>
										))}
									</div>
								</div>
								<Button type="submit" className="w-full mt-6">
									Zapisz zmiany
								</Button>
							</form>
						) : (
							<>
								<div className="relative w-32 h-32">
									<img
										src={userData?.profileImage || ""}
										alt="Avatar"
										width={128}
										height={128}
										className="rounded-full object-cover"
									/>
								</div>

								<h2 className="text-2xl font-bold">
									{userData?.name || ""}
								</h2>

								<div className="flex space-x-4 text-sm text-muted-foreground">
									{userData?.age && userData?.gender ? (
										<>
											<span>Wiek: {userData.age}</span>
											<span>
												Płeć:{" "}
												{userData.gender
													.charAt(0)
													.toUpperCase() +
													userData.gender.slice(1)}
											</span>
										</>
									) : (
										<span>
											Adres: ul.{" "}
											{userData?.street
												? userData.street
												: ""}
											,{" "}
											{userData?.city
												? userData.city
												: ""}
										</span>
									)}
								</div>

								<div className="text-sm text-muted-foreground">
									Udział w eventach:{" "}
									{userData?.eventsCount || 0}
								</div>

								<p className="text-center max-w-md">
									{userData?.description || ""}
								</p>

								<div className="flex flex-wrap justify-center gap-2">
									{userData?.interests?.map(
										(interest, index) => (
											<Button
												key={index}
												variant="secondary"
												size="sm"
											>
												{interest}
											</Button>
										)
									) || <></>}
								</div>

								<div className="w-full mt-6 text-center pt-5">
									<h3 className="text-lg font-semibold mb-2">
										Brał udział w:
									</h3>
									<hr className="border-t border-gray-200 mb-2" />
									<p className="text-sm text-muted-foreground">
										{userData?.eventHistory ||
											"Historia jest prywatna"}
									</p>
								</div>

								<div className="w-full mt-6 space-y-4">
									<h3 className="text-lg font-semibold">
										Dodatkowe informacje:
									</h3>
									<p>
										Lorem ipsum dolor sit amet, consectetur
										adipiscing elit.
									</p>
									<p>
										Duis aute irure dolor in reprehenderit
										in voluptate velit esse.
									</p>
								</div>
							</>
						)}
					</div>
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
			</main>

			<ProfileDialogs
				isSettingsOpen={isSettingsOpen}
				setIsSettingsOpen={setIsSettingsOpen}
			/>
		</div>
	);
}
