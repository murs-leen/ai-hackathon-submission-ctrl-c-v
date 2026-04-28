// Firebase Messaging Service Worker
// This file must be at the root of /public to handle background push notifications

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Config is populated at runtime — update these if your Firebase project changes
firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY,
  authDomain: self.FIREBASE_AUTH_DOMAIN,
  projectId: self.FIREBASE_PROJECT_ID,
  storageBucket: self.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID,
  appId: self.FIREBASE_APP_ID,
});

const messaging = firebase.messaging();

// Handle background messages (app is closed or in background)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || '📡 Stack Sentinel Alert';
  const notificationOptions = {
    body: payload.notification?.body || 'New alert for your stack',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'stack-sentinel-alert',
    data: { url: payload.data?.url || '/alerts' },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click — open the alerts page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/alerts';
  event.waitUntil(clients.openWindow(url));
});
