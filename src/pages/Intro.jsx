import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlusIcon, LogInIcon } from "lucide-react";
import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "../assets/logo.svg";
import {
	getAuth,
	signInWithEmailAndPassword,
	signInWithPopup,
	GoogleAuthProvider,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export default function Intro() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");

	const handleLogin = async (e) => {
		e.preventDefault();
		const auth = getAuth();

		try {
			const userCredential = await signInWithEmailAndPassword(
				auth,
				email,
				password
			);
			const user = userCredential.user;

			if (user.uid) {
				const userDoc = await getDoc(doc(db, "users", user.uid));

				if (userDoc.exists()) {
					navigate(`/profile/${user.uid}`);
				} else {
					navigate("/create-user");
				}
			}
		} catch (error) {
			console.error(error);
			setError("Nieprawidłowy email lub hasło");
		}
	};

	const handleGoogleLogin = async () => {
		const auth = getAuth();
		const provider = new GoogleAuthProvider();

		try {
			const result = await signInWithPopup(auth, provider);
			const user = result.user;

			if (user.uid) {
				const userDoc = await getDoc(doc(db, "users", user.uid));

				if (userDoc.exists()) {
					navigate(`/profile/${user.uid}`);
				} else {
					navigate("/create-user");
				}
			}
		} catch (error) {
			console.error("Błąd logowania przez Google: ", error);
			setError("Nie udało się zalogować przez Google");
		}
	};

	const handleRegister = () => {
		navigate("/register");
	};

	return (
		<div className="relative flex flex-col items-center justify-center min-h-screen bg-background p-4">
			<div className="w-full max-w-sm space-y-8">
				<div className="flex flex-col items-center space-y-2">
					<img src={logo} alt="Logo" width={100} height={100} />
					<h1 className="text-2xl font-bold">Nazwa Aplikacji</h1>
				</div>
				<div className="space-y-4">
					<form className="space-y-4" onSubmit={handleLogin}>
						<div className="space-y-2">
							<Input
								id="email"
								type="email"
								placeholder="Wprowadź email"
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className="rounded-full"
							/>
						</div>
						<div className="space-y-2">
							<Input
								id="password"
								type="password"
								placeholder="Wprowadź hasło"
								required
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="rounded-full"
							/>
						</div>
						{error && <p className="text-red-500">{error}</p>}
						<Button
							className="w-full rounded-full"
							variant="default"
							type="submit"
						>
							<LogInIcon className="mr-2 h-4 w-4" />
							Zaloguj się
						</Button>
					</form>

					<Button
						variant="outline"
						className="w-full rounded-full"
						onClick={handleGoogleLogin}
					>
						<Mail className="mr-2 h-4 w-4" />
						Zaloguj się przez Google
					</Button>

					<Button
						className="w-full rounded-full"
						variant="outline"
						onClick={handleRegister}
					>
						<UserPlusIcon className="mr-2 h-4 w-4" />
						Zarejestruj się
					</Button>
				</div>
			</div>

			<p className="absolute bottom-4 px-4 text-center text-sm text-muted-foreground">
				Rejestrując się, akceptujesz nasze{" "}
				<a
					href="#"
					className="underline underline-offset-4 hover:text-primary"
				>
					Warunki i Zasady
				</a>
				. Zobacz, jak wykorzystujemy Twoje dane w naszej{" "}
				<a
					href="#"
					className="underline underline-offset-4 hover:text-primary"
				>
					Polityce Prywatności
				</a>
				.
			</p>
		</div>
	);
}
