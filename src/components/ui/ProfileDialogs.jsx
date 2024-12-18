import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { HelpCircle, FileText, CreditCard, LogOut, Trash2 } from "lucide-react";
import logo from "../../assets/logo.svg";
import { auth, db } from "../../firebaseConfig";
import {
	signOut,
	deleteUser,
	reauthenticateWithCredential,
	EmailAuthProvider,
} from "firebase/auth";
import {
	doc,
	deleteDoc,
	collection,
	query,
	where,
	getDocs,
	updateDoc,
	arrayRemove,
} from "firebase/firestore";
import { getStorage, ref, deleteObject } from "firebase/storage";

export default function ProfileDialogs({ isSettingsOpen, setIsSettingsOpen }) {
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const { userId } = useParams();
	const navigate = useNavigate();
	const [userData, setUserData] = useState(null);

	useEffect(() => {
		const fetchUserData = async () => {
			if (auth.currentUser?.uid) {
				const q = query(
					collection(db, "users"),
					where("uid", "==", auth.currentUser?.uid)
				);
				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					querySnapshot.forEach((doc) => {
						const data = doc.data();
						setUserData(data);
					});
				} else {
					navigate(`/profile/${auth.currentUser?.uid}`);
				}
			}
		};

		fetchUserData();
	}, [userId, navigate]);

	const handleDeleteAccount = async (password) => {
		try {
			const user = auth.currentUser;
			if (!user) {
				throw new Error("No user logged in");
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
				const staticImageUrl =
					"https://firebasestorage.googleapis.com/v0/b/eventapp-1b046.appspot.com/o/static%2F1734554796895.webp?alt=media&token=124a6eed-de5c-4413-bd0b-154ef21bb933";
				if (userData.profileImage !== staticImageUrl) {
					const storage = getStorage();
					const imagePath = userData.profileImage
						.split("?")[0]
						.split("/o/")[1]
						.replace("%2F", "/");
					const imageRef = ref(storage, imagePath);
					await deleteObject(imageRef);
				}
			}

			await deleteUser(user);
			await signOut(auth);
			navigate("/");
		} catch (error) {
			console.error(error);
			throw error;
		}
	};

	const handleLogout = async () => {
		try {
			await signOut(auth);
			navigate("/");
		} catch (error) {
			console.error(error);
		}
	};

	const handleConfirm = async () => {
		if (password.trim() === "") {
			setError("Proszę wprowadzić hasło");
			return;
		}
		try {
			await handleDeleteAccount(password);
			setIsDeleteDialogOpen(false);
		} catch (error) {
			setError("Nieprawidłowe hasło. Spróbuj ponownie.");
		}
	};

	return (
		<>
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

			<Dialog
				open={isDeleteDialogOpen}
				onOpenChange={setIsDeleteDialogOpen}
			>
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
					{error && (
						<p className="text-red-500 text-sm mt-2">{error}</p>
					)}
					<DialogFooter>
						<Button
							variant="outline"
							onClick={() => setIsDeleteDialogOpen(false)}
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
		</>
	);
}
