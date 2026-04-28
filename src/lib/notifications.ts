import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import { app, db } from '@/lib/firebase';

/**
 * Request browser notification permission and get FCM token.
 * Returns the token string or null if denied/unavailable.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Notifications not supported in this environment');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
    if (!vapidKey) {
      console.warn('NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set — push tokens unavailable');
      return null;
    }

    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey });
    return token || null;
  } catch (err) {
    console.error('Error requesting notification permission:', err);
    return null;
  }
}

/**
 * Save FCM token to Firestore user document.
 */
export async function saveFCMToken(userId: string, token: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    fcmToken: token,
    notificationsEnabled: true,
  });
}

/**
 * Disable notifications for a user (remove token from Firestore).
 */
export async function disableNotifications(userId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    fcmToken: null,
    notificationsEnabled: false,
  });
}

/**
 * Listen for foreground FCM messages (app is open).
 * Returns an unsubscribe function.
 */
export function onNotificationReceived(callback: (payload: any) => void): () => void {
  try {
    const messaging = getMessaging(app);
    const unsubscribe = onMessage(messaging, callback);
    return unsubscribe;
  } catch {
    return () => {};
  }
}
