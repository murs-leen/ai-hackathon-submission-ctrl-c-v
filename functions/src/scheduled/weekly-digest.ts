import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendDigestEmail } from '../utils/email';

const db = admin.firestore();

// Runs every Monday at 9 AM UTC
export const weeklyDigest = functions.pubsub
  .schedule('0 9 * * 1')
  .timeZone('UTC')
  .onRun(async () => {
    console.log('Sending weekly Stack Sentinel digests...');

    const usersSnapshot = await db
      .collection('users')
      .where('settings.emailDigest', '==', true)
      .get();

    for (const userDoc of usersSnapshot.docs) {
      try {
        await sendUserDigest(userDoc.id, userDoc.data());
      } catch (err) {
        console.error(`Digest error for ${userDoc.id}:`, err);
      }
    }

    return null;
  });

export async function sendUserDigest(userId: string, userData: any) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const alertsSnapshot = await db
    .collection('users').doc(userId)
    .collection('alerts')
    .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(oneWeekAgo))
    .orderBy('createdAt', 'desc')
    .get();

  if (alertsSnapshot.empty) {
    console.log(`No alerts for ${userId}, skipping digest`);
    return;
  }

  const alerts = alertsSnapshot.docs.map(d => d.data());
  const totalCostImpact = alerts.reduce((sum, a) => sum + (a.costImpact || 0), 0);

  const stats = {
    totalAlerts: alerts.length,
    criticalAlerts: alerts.filter(a => a.urgency === 'critical').length,
    potentialSavings: Math.abs(Math.min(0, totalCostImpact)),
    actedOn: alerts.filter(a => a.status === 'acted').length,
  };

  await sendDigestEmail({
    to: userData.email || '',
    userName: userData.displayName || 'there',
    alerts,
    stats,
    dashboardUrl: 'https://stack-sentinel.vercel.app/dashboard',
  });

  console.log(`Sent weekly digest to ${userData.email}`);
}
