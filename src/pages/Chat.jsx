/* eslint-disable react/prop-types */
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

const allConversations = [
	{
		id: 1,
		title: "Avengers Endgame",
		avatar: "/placeholder.svg?height=40&width=40&text=AE",
		unreadCount: 2,
		date: "2023-06-15T14:00:00",
		location: "Kino Centrum",
	},
	{
		id: 2,
		title: "Wycieczka do Paryża",
		avatar: "/placeholder.svg?height=40&width=40&text=WP",
		unreadCount: 0,
		date: "2023-07-01T10:00:00",
		location: "Paryż, Francja",
	},
	{
		id: 3,
		title: "Przepisy keto",
		avatar: "/placeholder.svg?height=40&width=40&text=PK",
		unreadCount: 1,
		date: "2023-06-20T12:00:00",
		location: "Online",
	},
];

// Updated messages array without timestamps
const initialMessages = [
	{
		id: 1,
		sender: "Thor",
		avatar: "/placeholder.svg?height=32&width=32&text=T",
		content:
			"Hej wszystkim! Właśnie obejrzałem Avengers: Endgame. To było...",
		seenBy: ["U1", "U2", "U3", "U4", "U5", "U6"],
	},
	{
		id: 2,
		sender: "Czarna Wdowa",
		avatar: "/placeholder.svg?height=32&width=32&text=CW",
		content:
			"Chcę zobaczyć scenę, gdzie Thor i Thanos walczą. Na końcu Thanos próbuje podnieść Thora za szyję, a Thor mówi 'On próbuje mnie podnieść, haha'",
		seenBy: ["U1", "U2", "U3", "U4", "U5"],
	},
	{
		id: 3,
		sender: "Obecny Użytkownik",
		content:
			"Czekam na Strażników Galaktyki część 3! Słyszałem, że kończy się tak: 'Jesteśmy Strażnikami Galaktyki.' 'Co, jak stara ekipa?' 'Nie, nowi.'",
		seenBy: ["U1", "U2", "U3", "U4", "U5"],
	},
];

export default function Chat() {
	const [selectedConversation, setSelectedConversation] = useState(null);
	const [message, setMessage] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [conversations, setConversations] = useState(allConversations);
	const [messages, setMessages] = useState(initialMessages);
	const fileInputRef = useRef(null);
	const scrollAreaRef = useRef(null);
	const messagesEndRef = useRef(null);

	useEffect(() => {
		const filteredConversations = allConversations.filter((conv) =>
			conv.title.toLowerCase().includes(searchTerm.toLowerCase())
		);
		setConversations(
			filteredConversations.map((conv) => ({
				...conv,
				lastMessage:
					messages.length > 0
						? messages[messages.length - 1].content
						: "",
			}))
		);
	}, [searchTerm, messages]);

	useEffect(() => {
		if (selectedConversation) {
			scrollToBottom(false);
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

	const handleSendMessage = (e) => {
		e.preventDefault();
		if (message.trim() !== "") {
			const newMessage = {
				id: messages.length + 1,
				sender: "Obecny Użytkownik",
				content: message,
				seenBy: [],
			};
			setMessages([...messages, newMessage]);
			setMessage("");
		}
	};

	const handleFileUpload = (e) => {
		const file = e.target.files[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				const newMessage = {
					id: messages.length + 1,
					sender: "Obecny Użytkownik",
					content: (
						<img
							src={e.target.result}
							alt="Uploaded"
							className="max-w-full h-auto rounded-lg"
						/>
					),
					seenBy: [],
				};
				setMessages([...messages, newMessage]);
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
										src={selectedConversation.avatar}
									/>
									<AvatarFallback>
										{selectedConversation.title[0]}
									</AvatarFallback>
								</Avatar>
								<div className="flex-grow">
									<h2 className="font-semibold">
										{selectedConversation.title}
									</h2>
									<div className="flex items-center text-sm text-gray-500">
										<Calendar className="w-4 h-4 mr-1" />
										{new Date(
											selectedConversation.date
										).toLocaleString("pl-PL", {
											dateStyle: "medium",
											timeStyle: "short",
										})}
									</div>
									<div className="flex items-center text-sm text-gray-500">
										<MapPin className="w-4 h-4 mr-1" />
										{selectedConversation.location}
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
										<React.Fragment key={msg.id}>
											<MessageBubble
												message={msg}
												isCurrentUser={
													msg.sender ===
													"Obecny Użytkownik"
												}
												showAvatar={
													index === 0 ||
													messages[index - 1]
														.sender !== msg.sender
												}
											/>
											{index === messages.length - 1 &&
												msg.sender !==
													"Obecny Użytkownik" &&
												msg.seenBy.length > 0 && (
													<div
														className={`flex items-center mt-2 text-sm text-gray-500 ${
															msg.sender ===
															"Obecny Użytkownik"
																? "justify-end"
																: "justify-start"
														}`}
													>
														<span className="mr-2">
															Wyświetlone przez:
														</span>
														<div className="flex -space-x-2">
															{msg.seenBy
																.slice(0, 3)
																.map(
																	(
																		user,
																		index
																	) => (
																		<Avatar
																			key={
																				user
																			}
																			className={`w-6 h-6 border-2 border-white z-${
																				30 -
																				index *
																					10
																			}`}
																		>
																			<AvatarImage
																				src={`/placeholder.svg?height=24&width=24&text=${user}`}
																			/>
																			<AvatarFallback>
																				{
																					user
																				}
																			</AvatarFallback>
																		</Avatar>
																	)
																)}
															{msg.seenBy.length >
																3 && (
																<div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center text-xs font-semibold z-0">
																	+
																	{msg.seenBy
																		.length -
																		3}
																</div>
															)}
														</div>
													</div>
												)}
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
				<AvatarImage src={conversation.avatar} />
				<AvatarFallback>{conversation.title[0]}</AvatarFallback>
			</Avatar>
			<div className="flex-grow overflow-hidden">
				<h3 className="font-semibold">{conversation.title}</h3>
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
					<AvatarFallback>{message.sender[0]}</AvatarFallback>
				</Avatar>
			)}
			{!isCurrentUser && !showAvatar && <div className="w-8 mr-2" />}
			<div
				className={`max-w-[70%] p-3 rounded-lg ${
					isCurrentUser ? "bg-black text-white" : "bg-gray-200"
				}`}
			>
				{!isCurrentUser && showAvatar && (
					<p className="font-semibold mb-1">{message.sender}</p>
				)}
				{typeof message.content === "string" ? (
					<p>{message.content}</p>
				) : (
					message.content
				)}
			</div>
		</div>
	);
}
