"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Search,
	ChevronLeft,
	MoreVertical,
	Paperclip,
	Send,
	Calendar,
	MapPin,
	Bell,
	SlidersHorizontal,
	Smile,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import logo from "../assets/logo.svg";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";
import {
	doc,
	getDoc,
	updateDoc,
	onSnapshot,
	arrayUnion,
	Timestamp,
	collection,
	query,
	where,
	getDocs,
} from "firebase/firestore";

export default function Chat() {
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [message, setMessage] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [conversations, setConversations] = useState([]);
	const [messages, setMessages] = useState([]);
	const fileInputRef = useRef(null);
	const scrollAreaRef = useRef(null);
	const messagesEndRef = useRef(null);
	const auth = getAuth();

	useEffect(() => {
		const fetchAllEvents = async () => {
			if (!auth.currentUser) return;

			// Fetch joined events
			const myEventsRef = doc(db, "myevents", auth.currentUser.uid);
			const myEventsDoc = await getDoc(myEventsRef);
			let allEvents = [];

			if (myEventsDoc.exists()) {
				const joinedEventIds = myEventsDoc.data().joined || [];
				const joinedEventsData = await Promise.all(
					joinedEventIds.map(async (eventId) => {
						const eventDoc = await getDoc(
							doc(db, "events", eventId)
						);
						return { id: eventDoc.id, ...eventDoc.data() };
					})
				);
				allEvents = [...joinedEventsData];
			}

			// Fetch created events
			const createdEventsQuery = query(
				collection(db, "events"),
				where("creator", "==", auth.currentUser.uid)
			);
			const createdEventsSnapshot = await getDocs(createdEventsQuery);
			const createdEventsData = createdEventsSnapshot.docs.map((doc) => ({
				id: doc.id,
				...doc.data(),
			}));

			// Combine joined and created events
			allEvents = [...allEvents, ...createdEventsData];

			// Remove duplicates (in case a user joined their own event)
			const uniqueEvents = Array.from(
				new Set(allEvents.map((event) => event.id))
			).map((id) => allEvents.find((event) => event.id === id));

			setConversations(uniqueEvents);
		};

		fetchAllEvents();
	}, [auth.currentUser]);

	useEffect(() => {
		const filteredConversations = conversations.filter((conv) =>
			conv.eventName.toLowerCase().includes(searchTerm.toLowerCase())
		);
		setConversations(filteredConversations);
	}, [searchTerm]);

	useEffect(() => {
		if (selectedConversation) {
			scrollToBottom(false);
			const unsubscribe = onSnapshot(
				doc(db, "chats", selectedConversation.id),
				(doc) => {
					if (doc.exists()) {
						setMessages(doc.data().messages || []);
					}
				}
			);

			return () => unsubscribe();
		}
	}, [selectedConversation]);

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	const scrollToBottom = (smooth = true) => {
		messagesEndRef.current?.scrollIntoView({
			behavior: smooth ? "smooth" : "auto",
		});
	};

	const handleConversationClick = (conversation) => {
		setSelectedConversation(conversation);
	};

	const handleBackClick = () => {
		setSelectedConversation(null);
	};

	const handleSendMessage = async (e) => {
		e.preventDefault();
		if (message.trim() !== "" && auth.currentUser) {
			const newMessage = {
				senderId: auth.currentUser.uid,
				content: message,
				time: Timestamp.now(),
			};

			const chatRef = doc(db, "chats", selectedConversation.id);
			await updateDoc(chatRef, {
				messages: arrayUnion(newMessage),
			});

			setMessage("");
		}
	};

	const handleFileUpload = async (e) => {
		const file = e.target.files[0];
		if (file && auth.currentUser) {
			const reader = new FileReader();
			reader.onload = async (e) => {
				const newMessage = {
					senderId: auth.currentUser.uid,
					content: e.target.result,
					time: Timestamp.now(),
					type: "image",
				};

				const chatRef = doc(db, "chats", selectedConversation.id);
				await updateDoc(chatRef, {
					messages: arrayUnion(newMessage),
				});
			};
			reader.readAsDataURL(file);
		}
	};

	return (
		<div className="flex flex-col h-full bg-gray-100">
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
						<Button variant="ghost" size="icon" className="h-9 w-9">
							<SlidersHorizontal className="w-5 h-5" />
						</Button>
					</div>
				</div>
			</div>
			<div className="flex-grow overflow-hidden">
				<AnimatePresence>
					{!selectedConversation ? (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.2 }}
							className="flex flex-col h-full"
						>
							<div className="bg-white p-4">
								<h1 className="text-xl font-semibold mb-4">
									Moje konwersacje
								</h1>
								<div className="relative">
									<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
									<Input
										type="text"
										placeholder="Znajdź konwersację"
										className="pl-10 bg-gray-200 border-none"
										value={searchTerm}
										onChange={(e) =>
											setSearchTerm(e.target.value)
										}
									/>
								</div>
							</div>
							<ScrollArea className="flex-grow">
								<div className="p-4">
									{conversations.map((conversation) => (
										<ConversationItem
											key={conversation.id}
											conversation={conversation}
											onClick={() =>
												handleConversationClick(
													conversation
												)
											}
										/>
									))}
								</div>
							</ScrollArea>
						</motion.div>
					) : (
						<motion.div
							initial={{ x: "100%" }}
							animate={{ x: 0 }}
							exit={{ x: "100%" }}
							transition={{
								type: "spring",
								stiffness: 300,
								damping: 30,
							}}
							className="flex flex-col h-full bg-white"
						>
							<div className="bg-white p-4 flex items-center border-b">
								<Button
									variant="ghost"
									className="p-2 mr-2"
									onClick={handleBackClick}
								>
									<ChevronLeft className="w-6 h-6" />
								</Button>
								<Avatar className="w-10 h-10 mr-3">
									<AvatarImage
										src={selectedConversation.image}
									/>
									<AvatarFallback>
										{selectedConversation.eventName[0]}
									</AvatarFallback>
								</Avatar>
								<div className="flex-grow">
									<h2 className="font-semibold">
										{selectedConversation.eventName}
									</h2>
									<div className="flex items-center text-sm text-gray-500">
										<Calendar className="w-4 h-4 mr-1" />
										{new Date(
											selectedConversation.date
										).toLocaleString("pl-PL", {
											dateStyle: "medium",
										})}
										{", "}
										{selectedConversation.time}
									</div>
									<div className="flex items-center text-sm text-gray-500">
										<MapPin className="w-4 h-4 mr-1" />
										{selectedConversation.street}
										{", "}
										{selectedConversation.city}
									</div>
								</div>
								<Button variant="ghost" className="p-2">
									<MoreVertical className="w-6 h-6" />
								</Button>
							</div>
							<ScrollArea
								className="flex-grow"
								ref={scrollAreaRef}
							>
								<div className="p-4">
									{messages.map((msg, index) => (
										<React.Fragment key={index}>
											<MessageBubble
												message={msg}
												isCurrentUser={
													msg.senderId ===
													auth.currentUser?.uid
												}
												showAvatar={
													index === 0 ||
													messages[index - 1]
														.senderId !==
														msg.senderId
												}
											/>
										</React.Fragment>
									))}
									<div ref={messagesEndRef} />
								</div>
							</ScrollArea>
							<form
								onSubmit={handleSendMessage}
								className="p-4 border-t bg-white sticky bottom-0"
							>
								<div className="flex items-center bg-gray-100 rounded-full p-2">
									<Button
										type="button"
										variant="ghost"
										className="rounded-full p-2"
										onClick={() =>
											fileInputRef.current.click()
										}
									>
										<Paperclip className="w-6 h-6 text-gray-500" />
									</Button>
									<input
										type="file"
										ref={fileInputRef}
										className="hidden"
										accept="image/*"
										onChange={handleFileUpload}
									/>
									<Input
										type="text"
										placeholder="Napisz wiadomość"
										value={message}
										onChange={(e) =>
											setMessage(e.target.value)
										}
										className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0"
									/>
									<Button
										type="button"
										variant="ghost"
										className="rounded-full p-2"
									>
										<Smile className="w-6 h-6 text-gray-500" />
									</Button>
									<Button
										type="submit"
										variant="ghost"
										className="rounded-full p-2"
									>
										<Send className="w-6 h-6 text-black" />
									</Button>
								</div>
							</form>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

function ConversationItem({ conversation, onClick }) {
	const lastMessage = conversation.lastMessage || "";
	let truncatedMessage = "";

	if (typeof lastMessage === "string") {
		truncatedMessage =
			lastMessage.substring(0, 30) +
			(lastMessage.length > 30 ? "..." : "");
	} else if (React.isValidElement(lastMessage)) {
		truncatedMessage = "Obrazek";
	} else {
		truncatedMessage = "Nowa wiadomość";
	}

	return (
		<div
			className="flex items-center py-3 cursor-pointer"
			onClick={onClick}
		>
			<Avatar className="w-12 h-12 mr-3">
				<AvatarImage src={conversation.image} />
				<AvatarFallback>{conversation.eventName[0]}</AvatarFallback>
			</Avatar>
			<div className="flex-grow overflow-hidden">
				<h3 className="font-semibold">{conversation.eventName}</h3>
				<p className="text-sm text-gray-500 truncate">
					{truncatedMessage}
				</p>
			</div>
			{conversation.unreadCount > 0 && (
				<div className="bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center ml-2">
					{conversation.unreadCount}
				</div>
			)}
		</div>
	);
}

function MessageBubble({ message, isCurrentUser, showAvatar }) {
	return (
		<div
			className={`flex ${
				isCurrentUser ? "justify-end" : "justify-start"
			} ${showAvatar ? "mb-2" : "mb-1"}`}
		>
			{!isCurrentUser && showAvatar && (
				<Avatar className="w-8 h-8 mr-2">
					<AvatarImage src={message.avatar} />
					<AvatarFallback>{message.senderId[0]}</AvatarFallback>
				</Avatar>
			)}
			{!isCurrentUser && !showAvatar && <div className="w-8 mr-2" />}
			<div
				className={`max-w-[70%] p-3 rounded-lg ${
					isCurrentUser ? "bg-black text-white" : "bg-gray-200"
				}`}
			>
				{!isCurrentUser && showAvatar && (
					<p className="font-semibold mb-1">{message.senderId}</p>
				)}
				{message.type === "image" ? (
					<img
						src={message.content}
						alt="Uploaded"
						className="max-w-full h-auto rounded-lg"
					/>
				) : (
					<p>{message.content}</p>
				)}
			</div>
		</div>
	);
}