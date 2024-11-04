import { useEffect, useState } from "react";
import {
	BrowserRouter as Router,
	Route,
	Routes,
	Navigate,
} from "react-router-dom";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
	collection,
	getDocs,
	query,
	where,
	updateDoc,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import EventCard from "./pages/EventCard";
import Intro from "./pages/Intro";
import Register from "./pages/Register";
import UserCreator from "./pages/UserCreator";
import UserProfile from "./pages/UserProfile";
import MyEvents from "./pages/MyEvents";
import Chat from "./pages/Chat";
import CreateEvent from "./pages/CreateEvent";
import Layout from "./components/Layout";
import { getUserLocation } from "./lib/event-functions";

function App() {
	const [user, setUser] = useState(null);
	const [loading, setLoading] = useState(true);
	const [userExists, setUserExists] = useState(false);

	useEffect(() => {
		const auth = getAuth();
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			setUser(user);
			if (user) {
				const q = query(
					collection(db, "users"),
					where("uid", "==", user.uid)
				);
				const querySnapshot = await getDocs(q);
				if (!querySnapshot.empty) {
					setUserExists(true);
					updateUserLocation(querySnapshot.docs[0].id);
				} else {
					setUserExists(false);
				}
			} else {
				setUserExists(false);
			}
			setLoading(false);
		});

		return () => unsubscribe();
	}, []);

	const updateUserLocation = async (userId) => {
		// przy każdym odświeżeniu
		try {
			const location = await getUserLocation();
			if (location) {
				const userRef = collection(db, "users");
				const q = query(userRef, where("uid", "==", userId));
				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					const userDoc = querySnapshot.docs[0];
					await updateDoc(userDoc.ref, {
						lat: location.lat,
						lng: location.lng,
					});
				}
			}
		} catch (error) {
			console.error("Error updating user location:", error);
		}
	};

	if (loading) {
		return (
			<div className="absolute inset-0 flex items-center justify-center">
				Ładowanie...
			</div>
		);
	}

	return (
		<Router>
			<Routes>
				<Route
					path="/"
					element={
						user ? (
							user && userExists ? (
								<Navigate to={`/profile/${user.uid}`} />
							) : (
								<UserCreator />
							)
						) : (
							<Intro />
						)
					}
				/>
				<Route
					path="/register"
					element={
						user ? (
							user && userExists ? (
								<Navigate to={`/profile/${user.uid}`} />
							) : (
								<UserCreator />
							)
						) : (
							<Register />
						)
					}
				/>
				<Route
					path="/create-user"
					element={
						user ? (
							user && userExists ? (
								<Navigate to={`/profile/${user.uid}`} />
							) : (
								<UserCreator />
							)
						) : (
							<Navigate to="/" />
						)
					}
				/>
				<Route
					element={
						user ? (
							user && userExists ? (
								<Layout />
							) : (
								<UserCreator />
							)
						) : (
							<Navigate to="/" />
						)
					}
				>
					<Route
						path="/events"
						element={
							user ? (
								user && userExists ? (
									<EventCard />
								) : (
									<UserCreator />
								)
							) : (
								<Navigate to="/" />
							)
						}
					/>
					<Route
						path="/profile/:userId"
						element={
							user ? (
								user && userExists ? (
									<UserProfile />
								) : (
									<UserCreator />
								)
							) : (
								<Navigate to="/" />
							)
						}
					/>
					<Route
						path="/myevents"
						element={
							user ? (
								user && userExists ? (
									<MyEvents />
								) : (
									<UserCreator />
								)
							) : (
								<Navigate to="/" />
							)
						}
					/>
					<Route
						path="/chat"
						element={
							user ? (
								user && userExists ? (
									<Chat />
								) : (
									<UserCreator />
								)
							) : (
								<Navigate to="/" />
							)
						}
					/>
					<Route
						path="/event-creation"
						element={
							user ? (
								user && userExists ? (
									<CreateEvent />
								) : (
									<UserCreator />
								)
							) : (
								<Navigate to="/" />
							)
						}
					/>
				</Route>
			</Routes>
		</Router>
	);
}

export default App;
