import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { db, auth } from "../firebaseConfig";
import {
	collection,
	query,
	where,
	onSnapshot,
	updateDoc,
	doc,
} from "firebase/firestore";

export function Notifications() {
	const [notifications, setNotifications] = useState([]);
	const [unreadCount, setUnreadCount] = useState(0);

	useEffect(() => {
		const user = auth.currentUser;
		if (!user) return;

		const q = query(
			collection(db, "notifications"),
			where("userId", "==", user.uid)
		);
		const unsubscribe = onSnapshot(q, (querySnapshot) => {
			const notifs = [];
			querySnapshot.forEach((doc) => {
				notifs.push({ id: doc.id, ...doc.data() });
			});
			setNotifications(
				notifs.sort(
					(a, b) => b.createdAt.getTime() - a.createdAt.getTime()
				)
			);
			setUnreadCount(notifs.filter((n) => !n.read).length);
		});

		return () => unsubscribe();
	}, []);

	const markAsRead = async (notificationId) => {
		const notificationRef = doc(db, "notifications", notificationId);
		await updateDoc(notificationRef, { read: true });
	};

	const markAllAsRead = async () => {
		const user = auth.currentUser;
		if (!user) return;

		const batch = db.batch();
		notifications.forEach((notification) => {
			if (!notification.read) {
				const notificationRef = doc(
					db,
					"notifications",
					notification.id
				);
				batch.update(notificationRef, { read: true });
			}
		});
		await batch.commit();
	};

	const clearAllNotifications = async () => {
		const user = auth.currentUser;
		if (!user) return;

		const batch = db.batch();
		notifications.forEach((notification) => {
			const notificationRef = doc(db, "notifications", notification.id);
			batch.delete(notificationRef);
		});
		await batch.commit();
	};

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					className="h-9 w-9 relative"
				>
					<Bell className="w-5 h-5" />
					{unreadCount > 0 && (
						<span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs">
							{unreadCount}
						</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80 pb-2 mr-2">
				<Card>
					<CardContent className="p-0">
						<div className="p-4 border-b">
							<div className="font-semibold">Powiadomienia</div>
							{unreadCount > 0 && (
								<Button
									variant="link"
									className="p-0"
									onClick={markAllAsRead}
								>
									Oznacz wszystkie jako przeczytane
								</Button>
							)}
						</div>
						<div className="max-h-96 overflow-auto">
							{notifications.length === 0 ? (
								<div className="p-4 text-center text-gray-500">
									Brak powiadomień
								</div>
							) : (
								notifications.map((notification) => (
									<div
										key={notification.id}
										className={`p-4 border-b last:border-b-0 ${
											notification.read
												? "bg-gray-50"
												: "bg-white"
										}`}
										onClick={() =>
											markAsRead(notification.id)
										}
									>
										<div className="font-semibold">
											{notification.title}
										</div>
										<div className="text-sm text-gray-600">
											{notification.content}
										</div>
										<div className="text-xs text-gray-400 mt-1">
											{notification.createdAt.toLocaleString()}
										</div>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>
				<div className="pt-2">
					<Button
						variant="ghost"
						className="w-full"
						onClick={clearAllNotifications}
					>
						Wyczyść wszystkie
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
