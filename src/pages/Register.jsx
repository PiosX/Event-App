import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, ArrowLeft, Check, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import {
	createUserWithEmailAndPassword,
	signInWithPopup,
	GoogleAuthProvider,
} from "firebase/auth";
import logo from "../assets/logo.svg";

export default function Register() {
	const navigate = useNavigate();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [passwordTouched, setPasswordTouched] = useState(false);
	const [passwordValidation, setPasswordValidation] = useState({
		length: false,
		uppercase: false,
		lowercase: false,
		number: false,
		special: false,
	});

	useEffect(() => {
		if (passwordTouched) {
			validatePassword(password);
		}
	}, [password, passwordTouched]);

	const validatePassword = (password) => {
		setPasswordValidation({
			length: password.length >= 8,
			uppercase: /[A-Z]/.test(password),
			lowercase: /[a-z]/.test(password),
			number: /[0-9]/.test(password),
			special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
		});
	};

	const isPasswordValid = Object.values(passwordValidation).every(Boolean);

	const handleFirebaseError = (errorCode) => {
		switch (errorCode) {
			case "auth/email-already-in-use":
				return "Adres e-mail jest już używany.";
			case "auth/invalid-email":
				return "Nieprawidłowy adres e-mail.";
			case "auth/weak-password":
				return "Hasło jest zbyt słabe (min: 6 znaków).";
			default:
				return "Wystąpił nieznany błąd, spróbuj ponownie.";
		}
	};

	const handleRegister = async (e) => {
		e.preventDefault();
		if (!isPasswordValid) {
			setError("Hasło nie spełnia wszystkich wymagań.");
			return;
		}
		if (password !== confirmPassword) {
			setError("Hasła różnią się od siebie!");
			return;
		}
		try {
			await createUserWithEmailAndPassword(auth, email, password);
			navigate("/create-user", {
				state: {
					email,
				},
			});
		} catch (err) {
			const friendlyErrorMessage = handleFirebaseError(err.code);
			setError(friendlyErrorMessage);
			console.error(err.message);
		}
	};

	const handleGoogleSignIn = async () => {
		const provider = new GoogleAuthProvider();
		try {
			const result = await signInWithPopup(auth, provider);
			const user = result.user;
			navigate("/create-user", {
				state: {
					email: user.email,
				},
			});
		} catch (error) {
			const friendlyErrorMessage = handleFirebaseError(error.code);
			setError(friendlyErrorMessage);
			console.error(error.message);
		}
	};

	const handleGoBack = () => {
		navigate("/");
	};

	const ValidationItem = ({ isValid, text }) => (
		<div className="flex items-center space-x-2">
			{isValid ? (
				<Check className="w-4 h-4 text-green-500" />
			) : (
				<X className="w-4 h-4 text-red-500" />
			)}
			<span className={isValid ? "text-green-500" : "text-red-500"}>
				{text}
			</span>
		</div>
	);

	return (
		<div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
			<div className="w-full max-w-sm space-y-8">
				<div className="flex flex-col items-center space-y-2">
					<img src={logo} alt="Logo" width={100} height={100} />
					<h1 className="text-2xl font-bold">Rejestracja</h1>
				</div>

				<form className="space-y-4" onSubmit={handleRegister}>
					<div className="space-y-2">
						<Input
							id="email"
							type="email"
							placeholder="Wprowadź email"
							required
							className="rounded-full"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Input
							id="password"
							type="password"
							placeholder="Wprowadź hasło"
							required
							className="rounded-full"
							value={password}
							onChange={(e) => {
								setPassword(e.target.value);
								if (!passwordTouched) setPasswordTouched(true);
							}}
						/>
						{passwordTouched && !isPasswordValid && (
							<div className="text-sm space-y-1">
								<ValidationItem
									isValid={passwordValidation.length}
									text="Minimum 8 znaków"
								/>
								<ValidationItem
									isValid={passwordValidation.uppercase}
									text="Przynajmniej jedna duża litera"
								/>
								<ValidationItem
									isValid={passwordValidation.lowercase}
									text="Przynajmniej jedna mała litera"
								/>
								<ValidationItem
									isValid={passwordValidation.number}
									text="Przynajmniej jedna cyfra"
								/>
								<ValidationItem
									isValid={passwordValidation.special}
									text="Przynajmniej jeden znak specjalny"
								/>
							</div>
						)}
					</div>
					<div className="space-y-2">
						<Input
							id="confirm-password"
							type="password"
							placeholder="Powtórz hasło"
							required
							className="rounded-full"
							value={confirmPassword}
							onChange={(e) => setConfirmPassword(e.target.value)}
						/>
					</div>
					<Button
						type="submit"
						className="w-full rounded-full"
						disabled={!isPasswordValid}
					>
						Utwórz konto
					</Button>
				</form>
				{error && <p className="text-red-500">{error}</p>}
				<div className="space-y-4">
					<Button
						variant="outline"
						className="w-full rounded-full"
						onClick={handleGoogleSignIn}
					>
						<Mail className="mr-2 h-4 w-4" />
						Kontynuuj z Google
					</Button>
					<Button
						variant="outline"
						className="w-full rounded-full"
						onClick={handleGoBack}
					>
						<ArrowLeft className="mr-2 h-4 w-4" />
						Powrót do logowania
					</Button>
				</div>
			</div>
		</div>
	);
}
