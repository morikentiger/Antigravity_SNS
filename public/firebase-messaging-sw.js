// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
    apiKey: "AIzaSyAYHWK3nvC-JyNduHRseHrVRPQyS2yziaM",
    authDomain: "antigravity339.firebaseapp.com",
    projectId: "antigravity339",
    storageBucket: "antigravity339.firebasestorage.app",
    messagingSenderId: "60264793176",
    appId: "1:60264793176:web:753672c62ca35a6d02762d"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'Antigravity';
    const notificationOptions = {
        body: payload.notification?.body || '新しい通知があります',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: payload.data?.type || 'notification',
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Check if there is already a window/tab open with the target URL
                for (let i = 0; i < windowClients.length; i++) {
                    const client = windowClients[i];
                    if (client.url === urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If not, open a new window/tab with the target URL
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
    );
});
