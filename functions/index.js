const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

exports.checkEndedEvents = functions.pubsub
	.schedule("every 1 minutes")
	.onRun(async (context) => {
		const db = admin.firestore();
		const now = new Date();

		console.log(`Function started at: ${now.toISOString()}`);

		try {
			const eventsRef = db.collection("events");
			const snapshot = await eventsRef.where("ended", "==", false).get();

			console.log(`Found ${snapshot.size} non-ended events`);

			const batch = db.batch();
			let updatedCount = 0;

			for (const doc of snapshot.docs) {
				const data = doc.data();
				const endDate = new Date(data.endDate);
				const [hours, minutes] = data.endTime.split(":").map(Number);

				endDate.setUTCHours(hours, minutes, 0, 0);

				console.log(
					`Event ${
						doc.id
					}: endDate = ${endDate.toISOString()}, now = ${now.toISOString()}`
				);

				if (endDate <= now) {
					batch.update(doc.ref, { ended: true });
					updatedCount++;
					console.log(`Marking event ${doc.id} as ended`);
				}
			}

			if (updatedCount > 0) {
				await batch.commit();
				console.log(`Updated ${updatedCount} ended events.`);
			} else {
				console.log("No events to update.");
			}

			return null;
		} catch (error) {
			console.error("Error checking ended events:", error);
			return null;
		}
	});
