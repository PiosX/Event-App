import { useState, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SingleRowCalendar = ({
	startDate,
	onSelectDate,
	selectedDate,
	startTime,
}) => {
	const [currentWeek, setCurrentWeek] = useState([]);

	useEffect(() => {
		const [hours] = startTime.split(":").map(Number);
		const isLateNightEvent = hours >= 22;
		const startIndex = isLateNightEvent ? 1 : 0;
		const week = Array.from({ length: 7 }, (_, i) =>
			addDays(startDate, i + startIndex)
		);
		setCurrentWeek(week);
	}, [startDate, startTime]);

	const handlePrevWeek = (e) => {
		e.preventDefault();
		e.stopPropagation();
		const [hours] = startTime.split(":").map(Number);
		const isLateNightEvent = hours >= 22;
		setCurrentWeek((prev) =>
			prev.map((date) => addDays(date, isLateNightEvent ? -6 : -7))
		);
	};

	const handleNextWeek = (e) => {
		e.preventDefault();
		e.stopPropagation();
		setCurrentWeek((prev) => prev.map((date) => addDays(date, 7)));
	};

	const handleDateSelect = (e, date) => {
		e.preventDefault();
		e.stopPropagation();
		onSelectDate(date);
	};

	return (
		<div
			className="flex items-center space-x-2 overflow-x-auto pb-2"
			onClick={(e) => e.stopPropagation()}
		>
			<Button
				variant="outline"
				size="icon"
				onClick={handlePrevWeek}
				type="button"
			>
				<ChevronLeft className="h-4 w-4" />
			</Button>
			{currentWeek.map((date) => (
				<Button
					key={date.toISOString()}
					variant={
						isSameDay(date, selectedDate) ? "default" : "outline"
					}
					className="flex-shrink-0"
					onClick={(e) => handleDateSelect(e, date)}
					disabled={date < startDate}
					type="button"
				>
					<div className="text-center">
						<div className="text-sm font-semibold">
							{format(date, "EEE", { locale: pl })}
						</div>
						<div className="text-lg">
							{format(date, "d", { locale: pl })}
						</div>
					</div>
				</Button>
			))}
			<Button
				variant="outline"
				size="icon"
				onClick={handleNextWeek}
				type="button"
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
};

export default SingleRowCalendar;
