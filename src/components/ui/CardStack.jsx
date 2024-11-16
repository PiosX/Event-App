import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Lottie from "lottie-react";
import animationNotFound from "../../assets/animation-notFound.json";
import { CardView } from "@/pages/CardView";

export default function EventCardStack({
	events,
	setEvents,
	onJoin,
	onLike,
	onDislike,
	getTimeLeftColor,
	fetchNextEvent,
}) {
	const [stack, setStack] = useState(events.slice(0, 3));
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isFetching, setIsFetching] = useState(false);
	const [noMoreEvents, setNoMoreEvents] = useState(false);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		if (!initialized) {
			setInitialized(true);
			return;
		}

		if (
			currentIndex === stack.length && // koniec stosu
			!noMoreEvents && // jeszcze mamy w puli wydarzenia
			!isFetching && // nic nie pobieramy
			events.length > 0
		) {
			loadMoreFromStack();
		}
	}, [currentIndex, stack, noMoreEvents, isFetching, initialized, events]);

	const loadMoreFromStack = async () => {
		if (isFetching || noMoreEvents || events.length === 0) {
			return;
		}
		setIsFetching(true);

		try {
			const newEvents = await fetchNextEvent();

			if (newEvents && newEvents.length > 0) {
				// Wykluczamy wydarzenia które już mamy
				const newFilteredEvents = newEvents.filter(
					(newEvent) =>
						!events.some(
							(prevEvent) => prevEvent.id === newEvent.id
						)
				);

				if (newFilteredEvents.length > 0) {
					setStack((prevStack) => [
						...prevStack,
						...newFilteredEvents,
					]);
				}

				// wrzucanie wydarzeń do puli
				setEvents((prevEvents) => {
					return [...prevEvents.slice(1), ...newFilteredEvents];
				});
			} else {
				setNoMoreEvents(true);
			}
		} catch (error) {
			console.error("Błąd podczas ładowania wydarzeń:", error);
		} finally {
			setIsFetching(false);
		}
	};

	const handleSwipe = (direction) => {
		if (direction === "left") {
			onDislike(stack[currentIndex].id);
		} else if (direction === "right") {
			onJoin(stack[currentIndex].id);
		}
		setCurrentIndex((prevIndex) => prevIndex + 1);
	};

	if ((noMoreEvents && currentIndex >= stack.length) || events.length === 0) {
		return (
			<div className="h-full flex flex-col items-center justify-center">
				<Lottie
					animationData={animationNotFound}
					loop={true}
					autoplay={true}
					style={{ width: 200, height: 200 }}
				/>
				<p className="text-xl text-gray-600 text-center px-4">
					Niestety nie mamy dla Ciebie żadnych wydarzeń :(
				</p>
			</div>
		);
	}

	return (
		<div className="relative h-full w-full">
			<AnimatePresence>
				{stack
					.slice(currentIndex, currentIndex + 3)
					.map((event, index) => (
						<motion.div
							key={`${event.id}-${index}`}
							className="absolute top-0 left-0 right-0 bottom-0"
							initial={{
								scale: 1 - index * 0.05,
								y: index * 10,
								zIndex: 3 - index,
							}}
							animate={{
								scale: 1 - index * 0.05,
								y: index * 10,
								zIndex: 3 - index,
							}}
							exit={{
								x: event.action === "join" ? 300 : -300,
								opacity: 0,
							}}
							transition={{ duration: 0.3 }}
						>
							<CardView
								event={event}
								onSwipe={index === 0 ? handleSwipe : undefined}
								nextEvent={
									index === 0
										? () =>
												setCurrentIndex(
													(prevIndex) => prevIndex + 1
												)
										: undefined
								}
								showCloseButton={false}
								showNextButton={index === 0}
								onJoin={index === 0 ? onJoin : undefined}
								onLike={index === 0 ? onLike : undefined}
								onDislike={index === 0 ? onDislike : undefined}
								getTimeLeftColor={getTimeLeftColor}
								isInteractive={index === 0}
							/>
						</motion.div>
					))}
			</AnimatePresence>
			{isFetching && !noMoreEvents && (
				<p className="absolute bottom-4 text-center w-full">
					Ładowanie...
				</p>
			)}
		</div>
	);
}
