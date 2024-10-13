import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { db, auth } from "../firebaseConfig";
import { useEffect, useState } from "react";
import {
	collection,
	query,
	where,
	getDocs,
	deleteDoc,
	doc,
	arrayRemove,
	updateDoc,
} from "firebase/firestore";
import {
	Edit,
	SlidersHorizontal,
	Bell,
	HelpCircle,
	FileText,
	CreditCard,
	LogOut,
	Trash2,
} from "lucide-react";
import logo from "../assets/logo.svg";
import { useParams, useNavigate } from "react-router-dom";
import {
	signOut,
	deleteUser,
	reauthenticateWithCredential,
	EmailAuthProvider,
} from "firebase/auth";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { getStorage, ref, deleteObject } from "firebase/storage";

function PasswordConfirmDialog({ isOpen, onClose, onConfirm }) {
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleConfirm = () => {
		if (password.trim() === "") {
			setError("Proszę wprowadzić hasło");
			return;
		}
		onConfirm(password);
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="w-5/6 mx-auto px-8 rounded">
				<DialogHeader>
					<DialogTitle>Potwierdź usunięcie konta</DialogTitle>
					<DialogDescription>
						Proszę wprowadzić hasło, aby potwierdzić usunięcie
						konta. Ta akcja jest nieodwracalna.
					</DialogDescription>
				</DialogHeader>
				<Input
					type="password"
					placeholder="Wprowadź swoje hasło"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>
				{error && <p className="text-red-500 text-sm mt-2">{error}</p>}
				<DialogFooter>
					<Button
						variant="outline"
						onClick={onClose}
						className="mt-2"
					>
						Anuluj
					</Button>
					<Button variant="destructive" onClick={handleConfirm}>
						Usuń konto
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default function UserProfile() {
	const { userId } = useParams();
	const navigate = useNavigate();
	const [userData, setUserData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

	useEffect(() => {
		const fetchUserData = async () => {
			if (userId) {
				setLoading(true);
				const q = query(
					collection(db, "users"),
					where("uid", "==", userId)
				);
				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					querySnapshot.forEach((doc) => {
						setUserData(doc.data());
					});
				} else {
					navigate(`/profile/${currentUserId}`);
				}
				setLoading(false);
			}
		};

		fetchUserData();
	}, [userId, currentUserId, navigate]);

	const handleLogout = async () => {
		try {
			await signOut(auth);
			navigate("/");
		} catch (error) {
			console.error(error);
		}
	};

	const handleDeleteAccount = async (password) => {
		try {
			const user = auth.currentUser;
			if (!user) {
				return;
			}

			const credential = EmailAuthProvider.credential(
				user.email,
				password
			);
			await reauthenticateWithCredential(user, credential);

			// Delete events created by the user
			const eventsQuery = query(
				collection(db, "events"),
				where("creator", "==", user.uid)
			);
			const eventsSnapshot = await getDocs(eventsQuery);
			const eventIds = eventsSnapshot.docs.map((doc) => doc.id);

			for (const eventId of eventIds) {
				await deleteDoc(doc(db, "events", eventId));
				await deleteDoc(doc(db, "chats", eventId));
			}

			// Delete user's myevents document
			await deleteDoc(doc(db, "myevents", user.uid));

			// Remove user from chats they participated in
			const chatsQuery = query(
				collection(db, "chats"),
				where("participants", "array-contains", user.uid)
			);
			const chatsSnapshot = await getDocs(chatsQuery);
			for (const chatDoc of chatsSnapshot.docs) {
				await updateDoc(doc(db, "chats", chatDoc.id), {
					participants: arrayRemove(user.uid),
				});
			}

			// Find and delete the user document
			const userQuery = query(
				collection(db, "users"),
				where("uid", "==", user.uid)
			);
			const querySnapshot = await getDocs(userQuery);
			if (!querySnapshot.empty) {
				const userDoc = querySnapshot.docs[0];
				await deleteDoc(doc(db, "users", userDoc.id));
			}

			if (userData?.profileImage) {
				const storage = getStorage();
				const imagePath = userData?.profileImage
					.split("?")[0]
					.split("/o/")[1]
					.replace("%2F", "/");
				const imageRef = ref(storage, imagePath);
				await deleteObject(imageRef);
			}

			await deleteUser(user);

			await signOut(auth);
			navigate("/");
		} catch (error) {
			console.error(error);
		}
	};

	return (
		<div className="flex flex-col h-screen bg-background">
			<div className="bg-white shadow">
				<div className="container mx-auto px-4 flex items-center justify-between h-14">
					<div className="flex items-center">
						<img
							src={logo}
							alt="App Logo"
							className="w-6 h-6 mr-2"
						/>
						<span className="font-bold text-base">NazwaApp</span>
					</div>
					<div className="flex items-center space-x-2">
						<Button variant="ghost" size="icon" className="h-9 w-9">
							<Bell className="w-5 h-5" />
						</Button>
						<Button
							variant="ghost"
							size="icon"
							className="h-9 w-9"
							onClick={() => setIsSettingsOpen(true)}
						>
							<SlidersHorizontal className="w-5 h-5" />
						</Button>
					</div>
				</div>
			</div>

			<main className="flex-grow overflow-y-auto">
				<div className="container max-w-xl mx-auto px-4 py-8">
					<div className="flex flex-col items-center space-y-4">
						{currentUserId === userId && (
							<Button
								variant="outline"
								size="sm"
								className="mb-4"
							>
								<Edit className="w-4 h-4 mr-2" />
								Edytuj profil
							</Button>
						)}

						{loading ? (
							<div className="absolute inset-0 flex items-center justify-center">
								Ładowanie...
							</div>
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
									<span>Wiek: {userData?.age || ""}</span>
									<span>Płeć: {userData?.gender || ""}</span>
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
			</main>

			<Sheet open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
				<SheetContent
					side="right"
					className="w-full sm:max-w-full flex flex-col"
				>
					<SheetHeader className="flex justify-between items-center">
						<SheetTitle>Ustawienia</SheetTitle>
					</SheetHeader>
					<div className="flex flex-col flex-grow justify-between">
						<div className="mt-6 space-y-6">
							<div className="space-y-2">
								<h3 className="text-lg font-semibold">
									Support
								</h3>
								<Button
									variant="outline"
									className="w-full justify-start"
								>
									<HelpCircle className="mr-2 h-4 w-4" />
									Pomoc i wsparcie
								</Button>
							</div>
							<div className="space-y-2">
								<h3 className="text-lg font-semibold">
									Informacje
								</h3>
								<Button
									variant="outline"
									className="w-full justify-start"
								>
									<FileText className="mr-2 h-4 w-4" />
									Polityka prywatności
								</Button>
								<Button
									variant="outline"
									className="w-full justify-start"
								>
									<FileText className="mr-2 h-4 w-4" />
									Warunki i zasady
								</Button>
								<Button
									variant="outline"
									className="w-full justify-start"
								>
									<CreditCard className="mr-2 h-4 w-4" />
									Subskrypcja
								</Button>
							</div>
						</div>
						<div className="space-y-6 mt-auto">
							<Button
								variant="destructive"
								className="w-full"
								onClick={() => setIsDeleteDialogOpen(true)}
							>
								<Trash2 className="mr-2 h-4 w-4" />
								Usuń konto
							</Button>
							<div className="flex flex-col items-center space-y-2">
								<img
									src={logo}
									alt="Logo"
									className="w-12 h-12"
								/>
								<p className="text-sm text-muted-foreground">
									Wersja 0.01
								</p>
							</div>
							<Button
								variant="default"
								className="w-full bg-black text-white"
								onClick={handleLogout}
							>
								<LogOut className="mr-2 h-4 w-4" />
								Wyloguj
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			<PasswordConfirmDialog
				isOpen={isDeleteDialogOpen}
				onClose={() => setIsDeleteDialogOpen(false)}
				onConfirm={handleDeleteAccount}
			/>
		</div>
	);
}
