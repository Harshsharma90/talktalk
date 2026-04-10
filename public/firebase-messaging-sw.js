importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCjRYsyvbvNhurs6eUbzcm3C100hK50dl8",
  authDomain: "talk-talk-7bdaa.firebaseapp.com",
  projectId: "talk-talk-7bdaa",
  storageBucket: "talk-talk-7bdaa.firebasestorage.app",
  messagingSenderId: "870627759450",
  appId: "1:870627759450:web:45e3e1472af54719090f63",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message received:', payload);
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title, {
    body,
    icon: icon || '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [200, 100, 200],
    data: payload.data,
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://batcheed2.vercel.app')
  );
});