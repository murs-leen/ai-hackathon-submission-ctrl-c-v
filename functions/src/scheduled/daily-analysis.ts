import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { analyzeStackWithGemini } from '../utils/gemini';
import { sendSlackAlert } from '../utils/slack';

const db = admin.firestore();

// Runs every day at 6 AM UTC
// Requires Firebase Blaze plan
export const dailyAnalysis = functions.pubsub
  .schedule('0 6 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    console.log('Starting daily Stack Sentinel analysis...');

    const usersSnapshot = await db.collection('users').get();
    console.log(`Processing ${usersSnapshot.size} users`);

    for (const userDoc of usersSnapshot.docs) {
      try {
        await analyzeUserStack(userDoc.id, userDoc.data());
      } catch (err) {
        console.error(`Error for user ${userDoc.id}:`, err);
      }
    }

    console.log('Daily analysis complete');
    return null;
  });

async function analyzeUserStack(userId: string, userData: any) {
  const stackSnapshot = await db
    .collection('users').doc(userId)
    .collection('stacks').get();

  if (stackSnapshot.empty) return;

  const stack = stackSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  const alerts = await analyzeStackWithGemini(stack);
  const alertsRef = db.collection('users').doc(userId).collection('alerts');

  let savedCount = 0;
  for (const alert of alerts) {
    if (alert.isRelevant && (alert.relevanceScore || 0) > 50) {
      const docRef = await alertsRef.add({
        ...alert,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: 'automated',
      });

      // Slack notification for high-priority alerts
      if (userData.slackWebhook && userData.slackEnabled) {
        const levels = ['critical', 'high', 'medium', 'low'];
        const minLevel = userData.slackAlertLevel || 'high';
        if (levels.indexOf(alert.urgency) <= levels.indexOf(minLevel)) {
          await sendSlackAlert(userData.slackWebhook, alert).catch(console.error);
        }
      }
      savedCount++;
    }
  }

  console.log(`Saved ${savedCount} alerts for user ${userId}`);
}
