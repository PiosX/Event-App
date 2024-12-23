const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.checkEndedEvents = functions.pubsub
	.schedule("every 1 minutes")
	.onRun(async (context) => {
		const db = admin.firestore();
		const now = new Date();

		try {
			const eventsRef = db.collection("events");
			const snapshot = await eventsRef.where("ended", "==", false).get();

			const batch = db.batch();
			let updatedCount = 0;

			for (const doc of snapshot.docs) {
				const data = doc.data();
				const endDate = new Date(data.endDate);
				const [hours, minutes] = data.endTime.split(":").map(Number);

				endDate.setUTCHours(hours, minutes, 0, 0);

				if (endDate <= now) {
					batch.update(doc.ref, { ended: true });
					updatedCount++;
				}
			}

			if (updatedCount > 0) {
				await batch.commit();
			}

			return null;
		} catch (error) {
			console.error(error);
			return null;
		}
	});
