import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Calendar, MessageCircle, User, Users, PlusCircle } from "lucide-react";

function Layout() {
	const location = useLocation();
	const navigate = useNavigate();

	return (
		<div className="h-screen bg-gray-100 flex flex-col">
			<div className="flex-grow overflow-hidden relative">
				<Outlet />
			</div>
			<footer className="bg-background border-t">
				<nav className="container max-w-xl mx-auto px-4 py-2">
					<ul className="flex justify-evenly items-center">
						<li>
							<Button
								variant="ghost"
								size="icon"
								className={
									location.pathname === "/events"
										? "text-primary"
										: "text-muted-foreground"
								}
								onClick={() => navigate("/events")}
							>
								<Calendar className="w-6 h-6" />
								<span className="sr-only">Wydarzenia</span>
							</Button>
						</li>
						<li>
							<Button
								variant="ghost"
								size="icon"
								className={
									location.pathname === "/myevents"
										? "text-primary"
										: "text-muted-foreground"
								}
								onClick={() => navigate("/myevents")}
							>
								<Users className="w-6 h-6" />
								<span className="sr-only">Moje wydarzenia</span>
							</Button>
						</li>
						<li>
							<Button
								variant="ghost"
								size="icon"
								className={
									location.pathname === "/event-creation"
										? "text-primary"
										: "text-muted-foreground"
								}
								onClick={() => navigate("/event-creation")}
							>
								<PlusCircle className="w-6 h-6" />
								<span className="sr-only">
									Utwórz wydarzenie
								</span>
							</Button>
						</li>
						<li>
							<Button
								variant="ghost"
								size="icon"
								className={
									location.pathname === "/chat"
										? "text-primary"
										: "text-muted-foreground"
								}
								onClick={() => navigate("/chat")}
							>
								<MessageCircle className="w-6 h-6" />
								<span className="sr-only">Chat</span>
							</Button>
						</li>
						<li>
							<Button
								variant="ghost"
								size="icon"
								className={
									location.pathname.startsWith("/profile")
										? "text-primary"
										: "text-muted-foreground"
								}
								onClick={() => navigate("/profile/user")}
							>
								<User className="w-6 h-6" />
								<span className="sr-only">Profil</span>
							</Button>
						</li>
					</ul>
				</nav>
			</footer>
		</div>
	);
}

export default Layout;
