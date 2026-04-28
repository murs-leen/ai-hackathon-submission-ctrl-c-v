import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendSlackAlert } from '../utils/slack';

const db = admin.firestore();

export const onAlertCreated = functions.firestore
  .document('users/{userId}/alerts/{alertId}')
  .onCreate(async (snap, context) => {
    const alert = snap.data();
    const { userId } = context.params;

    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    if (!userData) return null;

    // --- Push Notification (critical only) ---
    if (alert.urgency === 'critical' && userData.fcmToken && userData.notificationsEnabled) {
      try {
        await admin.messaging().send({
          token: userData.fcmToken,
          notification: {
            title: '🚨 Critical Stack Alert',
            body: (alert.whyRelevant || 'A critical change affects your stack').substring(0, 100),
          },
          webpush: {
            fcmOptions: { link: 'https://stack-sentinel.vercel.app/alerts' },
          },
        });
        console.log(`Push sent to user ${userId}`);
      } catch (err) {
        console.error('Push notification error:', err);
      }
    }

    // --- Slack Notification ---
    if (userData.slackWebhook && userData.slackEnabled) {
      const levels = ['critical', 'high', 'medium', 'low'];
      const minLevel = userData.slackAlertLevel || 'high';
      if (levels.indexOf(alert.urgency) <= levels.indexOf(minLevel)) {
        await sendSlackAlert(userData.slackWebhook, alert).catch(console.error);
      }
    }

    return null;
  });
