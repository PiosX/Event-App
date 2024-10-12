import { Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { db } from "../firebaseConfig";
import { collection, query, where, getDocs } from "firebase/firestore";

const PrivateRoute = () => {
	const auth = getAuth();
	const [loading, setLoading] = useState(true);
	const [hasUser, setHasUser] = useState(null);
	const [authUser, setAuthUser] = useState(null);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, async (user) => {
			if (user) {
				setAuthUser(user);
				const q = query(
					collection(db, "users"),
					where("uid", "==", user.uid)
				);
				const querySnapshot = await getDocs(q);
				setHasUser(!querySnapshot.empty);
			} else {
				setAuthUser(null);
				setHasUser(null);
			}
			setLoading(false);
		});

		return () => unsubscribe();
	}, [auth]);

	if (loading) {
		return <div>Ładowanie...</div>;
	}

	if (!authUser) {
		return <Navigate to="/" />;
	}

	if (authUser && hasUser) {
		return <Navigate to={`/profile/${authUser.uid}`} />;
	}

	if (authUser && !hasUser) {
		return <Navigate to="/create-user" />;
	}
};

export default PrivateRoute;
