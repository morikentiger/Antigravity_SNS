'use client';

import { useEffect, useState } from 'react';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { database } from './firebase';

export function useNotifications(userId: string | null) {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            console.log('This browser does not support notifications');
            return false;
        }

        try {
            const permission = await Notification.requestPermission();
            setPermission(permission);

            if (permission === 'granted' && userId) {
                // Get FCM token
                const messaging = getMessaging();
                const currentToken = await getToken(messaging, {
                    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                });

                if (currentToken) {
                    console.log('FCM Token:', currentToken);
                    setToken(currentToken);

                    // Save token to database
                    await set(ref(database, `users/${userId}/fcmToken`), currentToken);

                    return true;
                } else {
                    console.log('No registration token available');
                    return false;
                }
            }

            return permission === 'granted';
        } catch (error) {
            console.error('Error requesting notification permission:', error);
            return false;
        }
    };

    useEffect(() => {
        if (!userId || typeof window === 'undefined') return;

        try {
            const messaging = getMessaging();

            // Handle foreground messages
            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('Foreground message received:', payload);

                if (Notification.permission === 'granted') {
                    const notificationTitle = payload.notification?.title || 'Antigravity';
                    const notificationOptions = {
                        body: payload.notification?.body || '新しい通知があります',
                        icon: '/icon-192x192.png',
                        tag: payload.data?.type || 'notification',
                        data: payload.data
                    };

                    const notification = new Notification(notificationTitle, notificationOptions);

                    notification.onclick = () => {
                        window.focus();
                        const url = payload.data?.url || '/';
                        window.location.href = url;
                        notification.close();
                    };
                }
            });

            return () => unsubscribe();
        } catch (error) {
            console.error('Error setting up messaging:', error);
        }
    }, [userId]);

    return {
        permission,
        token,
        requestPermission,
        isSupported: typeof window !== 'undefined' && 'Notification' in window
    };
}
