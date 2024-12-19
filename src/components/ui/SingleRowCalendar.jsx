import { useState, useEffect } from "react";
import { format, addDays, isSameDay } from "date-fns";
import { pl } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const SingleRowCalendar = ({ startDate, onSelectDate, selectedDate }) => {
	const [currentWeek, setCurrentWeek] = useState([]);

	useEffect(() => {
		const week = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
		setCurrentWeek(week);
	}, [startDate]);

	const handlePrevWeek = () => {
		setCurrentWeek((prev) => prev.map((date) => addDays(date, -7)));
	};

	const handleNextWeek = () => {
		setCurrentWeek((prev) => prev.map((date) => addDays(date, 7)));
	};

	return (
		<div className="flex items-center space-x-2 overflow-x-auto pb-2">
			<Button variant="outline" size="icon" onClick={handlePrevWeek}>
				<ChevronLeft className="h-4 w-4" />
			</Button>
			{currentWeek.map((date) => (
				<Button
					key={date.toISOString()}
					variant={
						isSameDay(date, selectedDate) ? "default" : "outline"
					}
					className="flex-shrink-0"
					onClick={() => onSelectDate(date)}
					disabled={date < startDate}
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
			<Button variant="outline" size="icon" onClick={handleNextWeek}>
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
};

export default SingleRowCalendar;
