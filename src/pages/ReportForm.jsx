import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import emailjs from "emailjs-com";

export default function ReportForm({ eventId, onClose, userId }) {
	const [reason, setReason] = useState("");
	const [details, setDetails] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isSuccess, setIsSuccess] = useState(false);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setIsLoading(true);

		const templateParams = {
			eventId,
			userId,
			reason: reason || "No reason provided",
			details,
		};

		try {
			await emailjs.send(
				import.meta.env.VITE_APP_EMAIL_SERVICE_ID,
				import.meta.env.VITE_APP_EMAIL_TEMPLATE_ID,
				templateParams,
				import.meta.env.VITE_APP_EMAIL_USER_ID
			);
			setIsSuccess(true);
			setTimeout(() => {
				onClose();
			}, 2000);
		} catch (error) {
			console.error(error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
			<div className="bg-white p-6 rounded-lg max-w-md w-full">
				<h2 className="text-2xl font-bold mb-4">Zgłoś wydarzenie</h2>
				<form onSubmit={handleSubmit}>
					<div className="mb-4">
						<Label htmlFor="reason">Podaj powód zgłoszenia:</Label>
						<Select
							value={reason}
							onValueChange={setReason}
							required
						>
							<SelectTrigger>
								<SelectValue placeholder="Wybierz powód" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="offensive">
									Obraźliwy opis
								</SelectItem>
								<SelectItem value="inappropriate">
									Niestosowne zdjęcie
								</SelectItem>
								<SelectItem value="spam">Spam</SelectItem>
								<SelectItem value="other">Inne</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div className="mb-4">
						<Label htmlFor="details">Opowiedz nam więcej:</Label>
						<Textarea
							id="details"
							value={details}
							onChange={(e) => setDetails(e.target.value)}
							placeholder="Wprowadź dodatkowe informacje"
							required
						/>
					</div>
					<div className="flex justify-end space-x-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
						>
							Anuluj
						</Button>
						<Button type="submit" disabled={isLoading}>
							{isLoading ? (
								<span className="flex items-center">
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
									Wysyłanie...
								</span>
							) : (
								"Wyślij"
							)}
						</Button>
					</div>
				</form>
				{isSuccess && (
					<div className="mt-4 p-4 bg-green-100 text-green-700 rounded-md">
						Pomyślnie wysłano zgłoszenie. Okno zostanie zamknięte za
						chwilę.
					</div>
				)}
			</div>
		</div>
	);
}
