import React, { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { db, auth } from "../firebaseConfig";
import {
	collection,
	query,
	where,
	getDocs,
	updateDoc,
} from "firebase/firestore";

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

export function PreferencesPanel({
	onClose,
	userPreferences,
	setUserPreferences,
}) {
	const [selectedInterests, setSelectedInterests] = useState([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [showPersonLimit, setShowPersonLimit] = useState(false);
	const [personLimit, setPersonLimit] = useState(50);
	const [showInterestsList, setShowInterestsList] = useState(false);
	const [location, setLocation] = useState("");
	const [meetRequirements, setMeetRequirements] = useState(true);
	const [distance, setDistance] = useState(10);
	const [searchByDate, setSearchByDate] = useState(false);
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const searchInputRef = useRef(null);

	useEffect(() => {
		fetchUserPreferences();
	}, []);

	const fetchUserPreferences = async () => {
		const user = auth.currentUser;
		if (user) {
			try {
				const usersRef = collection(db, "users");
				const q = query(usersRef, where("uid", "==", user.uid));
				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					const userData = querySnapshot.docs[0].data();
					const preferences = userData.preferences || {};

					setSelectedInterests(preferences.interests || []);
					setLocation(preferences.location || "");
					setShowPersonLimit(preferences.usePersonLimit || false);
					setPersonLimit(preferences.personLimit || 50);
					setMeetRequirements(preferences.meetRequirements !== false);
					setDistance(preferences.distance || 10);
					setSearchByDate(preferences.searchByDate || false);
					setStartDate(preferences.startDate || "");
					setEndDate(preferences.endDate || "");
				} else {
					console.log("No user document found");
				}
			} catch (error) {
				console.error("Error fetching user preferences:", error);
			}
		}
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

	useEffect(() => {
		function handleClickOutside(event) {
			if (
				searchInputRef.current &&
				!searchInputRef.current.contains(event.target)
			) {
				setShowInterestsList(false);
			}
		}

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	const handleSavePreferences = async () => {
		const newPreferences = {
			interests: selectedInterests,
			location,
			usePersonLimit: showPersonLimit,
			personLimit,
			meetRequirements,
			distance,
			searchByDate,
			startDate,
			endDate,
		};

		setUserPreferences(newPreferences);

		const user = auth.currentUser;
		if (user) {
			try {
				const usersRef = collection(db, "users");
				const q = query(usersRef, where("uid", "==", user.uid));
				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					const userDoc = querySnapshot.docs[0];
					await updateDoc(userDoc.ref, {
						preferences: newPreferences,
					});
					console.log("Preferences saved successfully");
				} else {
					console.error("No user document found to update");
				}
			} catch (error) {
				console.error("Error saving preferences:", error);
			}
		}

		onClose();
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg p-6 w-5/6 max-w-md">
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-xl font-bold">Preferencje</h2>
					<Button variant="ghost" size="icon" onClick={onClose}>
						<X className="w-6 h-6" />
					</Button>
				</div>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Zainteresowania (max 10)</Label>
						<div ref={searchInputRef}>
							<Input
								type="text"
								placeholder="Szukaj zainteresowań"
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								onFocus={() => setShowInterestsList(true)}
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
							{showInterestsList && (
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
												handleInterestChange(interest)
											}
										>
											{interest}
										</div>
									))}
								</div>
							)}
						</div>
					</div>
					<div>
						<Label htmlFor="location">Lokalizacja</Label>
						<Input
							id="location"
							placeholder="Wpisz miasto lub adres"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
						/>
					</div>
					<div className="pb-2">
						<Label htmlFor="distance">
							Szukaj w promieniu: {distance} km
						</Label>
						<Slider
							id="distance"
							min={0}
							max={100}
							step={1}
							value={[distance]}
							onValueChange={(value) => setDistance(value[0])}
							className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:rounded-sm [&_[role=slider]]:bg-black"
						/>
					</div>
					<div>
						<div className="flex items-center space-x-2">
							<Checkbox
								id="usePersonLimit"
								checked={showPersonLimit}
								onCheckedChange={setShowPersonLimit}
							/>
							<Label htmlFor="usePersonLimit">
								Szukaj z limitem osób
							</Label>
						</div>
					</div>
					{showPersonLimit && (
						<div>
							<Label htmlFor="personLimit">
								Maksymalna liczba osób: {personLimit}
							</Label>
							<Slider
								id="personLimit"
								min={1}
								max={100}
								step={1}
								value={[personLimit]}
								onValueChange={(value) =>
									setPersonLimit(value[0])
								}
								className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4 [&_[role=slider]]:rounded-sm [&_[role=slider]]:bg-black"
							/>
						</div>
					)}
					<div className="flex items-center space-x-2">
						<Checkbox
							id="searchByDate"
							checked={searchByDate}
							onCheckedChange={setSearchByDate}
						/>
						<Label htmlFor="searchByDate">Szukaj według daty</Label>
					</div>

					{searchByDate && (
						<div className="flex space-x-2">
							<div className="flex-1">
								<Label htmlFor="startDate">
									Data początkowa
								</Label>
								<Input
									id="startDate"
									type="date"
									value={startDate}
									onChange={(e) =>
										setStartDate(e.target.value)
									}
									min={new Date().toISOString().split("T")[0]}
								/>
							</div>
							<div className="flex-1">
								<Label htmlFor="endDate">Data końcowa</Label>
								<Input
									id="endDate"
									type="date"
									value={endDate}
									onChange={(e) => setEndDate(e.target.value)}
								/>
							</div>
						</div>
					)}
					<div className="flex items-center space-x-2">
						<Checkbox
							id="meetRequirements"
							checked={meetRequirements}
							onCheckedChange={setMeetRequirements}
						/>
						<Label htmlFor="meetRequirements">
							Szukaj wydarzeń gdzie spełniam wymagania
						</Label>
					</div>
				</div>
				<Button className="w-full mt-4" onClick={handleSavePreferences}>
					Zapisz preferencje
				</Button>
			</div>
		</div>
	);
}
