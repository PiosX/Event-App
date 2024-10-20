import { Button } from "@/components/ui/button";
import { Bell, SlidersHorizontal } from "lucide-react";
import logo from "../../assets/logo.svg";

export default function TopNavBar({ onSettingsClick }) {
	return (
		<div className="bg-white shadow z-10">
			<div className="container mx-auto px-4 flex items-center justify-between h-14">
				<div className="flex items-center">
					<img src={logo} alt="App Logo" className="w-6 h-6 mr-2" />
					<span className="font-bold text-base">NazwaApp</span>
				</div>
				<div className="flex items-center space-x-2">
					<Button variant="ghost" size="icon" className="h-9 w-9">
						<Bell className="w-5 h-5" />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="h-9 w-9"
						onClick={onSettingsClick}
					>
						<SlidersHorizontal className="w-5 h-5" />
					</Button>
				</div>
			</div>
		</div>
	);
}
