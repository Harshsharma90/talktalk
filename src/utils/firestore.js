
import { db } from "../firebase";
import {
  collection, query, where, getDocs, addDoc, doc,
  setDoc, getDoc, updateDoc, serverTimestamp, orderBy,
  onSnapshot, arrayUnion, arrayRemove,
} from "firebase/firestore";
export async function getOrCreateChat(uid1, uid2) {
  const ids = [uid1, uid2].sort();
  const chatId = ids.join("_");
  const chatRef = doc(db, "chats", chatId);
  const snap = await getDoc(chatRef);
  if (!snap.exists()) {
    await setDoc(chatRef, {
      participants: ids,
      createdAt: serverTimestamp(),
      lastMessage: null,
      lastMessageTime: null,
    });
  }
  return chatId;
}
export async function sendMessage(chatId, senderId, text) {
  const msgRef = collection(db, "chats", chatId, "messages");
  await addDoc(msgRef, {
    senderId,
    text,
    createdAt: serverTimestamp(),
    readBy: [senderId],
  });
  await updateDoc(doc(db, "chats", chatId), {
    lastMessage: text,
    lastMessageTime: serverTimestamp(),
  });
}
export async function findUserByPhone(phone) {
  const normalized = phone.startsWith("+") ? phone : `+91${phone}`;
  const q = query(collection(db, "users"), where("phoneNumber", "==", normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
export async function findUserByEmail(email) {
  const trimmed = email.trim().toLowerCase();
  const q = query(collection(db, "users"), where("email", "==", trimmed));
  const snap = await getDocs(q);
  console.log("Searching email:", trimmed, "Results:", snap.size);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}
export async function addContact(myUid, theirUid) {
  await setDoc(doc(db, "users", myUid, "contacts", theirUid), { uid: theirUid, addedAt: serverTimestamp() });
  await setDoc(doc(db, "users", theirUid, "contacts", myUid), { uid: myUid, addedAt: serverTimestamp() });
  return getOrCreateChat(myUid, theirUid);
}
export async function getUserContacts(uid) {
  const snap = await getDocs(collection(db, "users", uid, "contacts"));
  const contacts = [];
  for (const d of snap.docs) {
    const userSnap = await getDoc(doc(db, "users", d.id));
    if (userSnap.exists()) {
      const chatId = [uid, d.id].sort().join("_");
      const chatSnap = await getDoc(doc(db, "chats", chatId));
      contacts.push({
        ...userSnap.data(),
        id: d.id,
        chatId,
        lastMessage: chatSnap.exists() ? chatSnap.data().lastMessage : null,
        lastMessageTime: chatSnap.exists() ? chatSnap.data().lastMessageTime : null,
      });
    }
  }
  return contacts;
}
export async function sendSystemMessage(chatId, text) {
  await addDoc(collection(db, "chats", chatId, "messages"), {
    senderId: "system",
    text,
    createdAt: serverTimestamp(),
    readBy: [],
  });
}
export async function markMessagesRead(chatId, uid) {
}
export async function setUserOnline(uid, online) {
   try {
    await setDoc(doc(db, "users", uid), { online, lastSeen: serverTimestamp() }, { merge: true });
  } catch (e) {
    console.warn("setUserOnline failed:", e.message);
  }
}

export async function setTyping(chatId, uid, isTyping) {
  try {
    await setDoc(doc(db, "chats", chatId, "typing", uid), {
      isTyping,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.warn("setTyping failed:", e);
  }
}
