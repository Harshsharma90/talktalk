import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";

export async function requestNotificationPermission(uid) {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Notification permission denied");
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_KEY,
    });

    if (token) {
      // Save token to Firestore
      await setDoc(doc(db, "users", uid), {
        fcmToken: token,
      }, { merge: true });
      console.log("FCM token saved:", token);
      return token;
    }
  } catch (e) {
    console.warn("Failed to get FCM token:", e);
  }
  return null;
}

export function onForegroundMessage(callback) {
  return onMessage(messaging, (payload) => {
    console.log("Foreground message:", payload);
    callback(payload);
  });
}