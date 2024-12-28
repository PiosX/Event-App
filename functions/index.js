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

exports.sendNotification = functions.firestore
	.document("events/{eventId}")
	.onUpdate(async (change, context) => {
		const newValue = change.after.data();
		const previousValue = change.before.data();

		const sendNotificationToUsers = async (userIds, title, content) => {
			const batch = admin.firestore().batch();
			userIds.forEach((userId) => {
				const notificationRef = admin
					.firestore()
					.collection("notifications")
					.doc();
				batch.set(notificationRef, {
					userId,
					title,
					content,
					createdAt: admin.firestore.FieldValue.serverTimestamp(),
					read: false,
				});
			});
			await batch.commit();
		};

		// Powiadomienie o rozpoczęciu wydarzenia za 2 godziny
		const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
		if (
			new Date(newValue.date) <= twoHoursFromNow &&
			new Date(previousValue.date) > twoHoursFromNow
		) {
			await sendNotificationToUsers(
				newValue.participants,
				"Przypomnienie o wydarzeniu",
				`Wydarzenie "${newValue.eventName}" rozpocznie się za 2 godziny!`
			);
		}

		// Powiadomienie o edycji wydarzenia
		if (
			newValue.lastEditTime &&
			(!previousValue.lastEditTime ||
				newValue.lastEditTime > previousValue.lastEditTime)
		) {
			const participantsToNotify = newValue.participants.filter(
				(p) => p !== newValue.creator
			);
			await sendNotificationToUsers(
				participantsToNotify,
				"Aktualizacja wydarzenia",
				`Wydarzenie "${newValue.eventName}" zostało zaktualizowane.`
			);
		}

		// Powiadomienie o nowych uczestnikach
		const newParticipants = newValue.participants.filter(
			(p) => !previousValue.participants.includes(p)
		);
		if (newParticipants.length > 0) {
			const content =
				newParticipants.length === 1
					? `${newParticipants[0]} dołączył(a) do wydarzenia "${newValue.eventName}".`
					: `${newParticipants[0]}, ${newParticipants[1]} i ${
							newParticipants.length - 2
					  } innych osób dołączyło do wydarzenia "${
							newValue.eventName
					  }".`;
			await sendNotificationToUsers(
				previousValue.participants,
				"Nowi uczestnicy",
				content
			);
		}

		// Powiadomienie o usunięciu wydarzenia
		if (!newValue.active && previousValue.active) {
			await sendNotificationToUsers(
				previousValue.participants,
				"Wydarzenie anulowane",
				`Wydarzenie "${previousValue.eventName}" zostało anulowane.`
			);
		}
	});
