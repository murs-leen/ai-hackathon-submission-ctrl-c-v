import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendWelcomeEmail } from '../utils/email';

const db = admin.firestore();

export const onUserCreated = functions.auth.user().onCreate(async (user) => {
  // Create default user preferences document
  await db.collection('users').doc(user.uid).set({
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    settings: {
      emailDigest: true,
      digestFrequency: 'weekly',
      notificationsEnabled: false,
      autoAnalysis: true,
      relevanceThreshold: 60,
      slackEnabled: false,
      slackWebhook: '',
      slackAlertLevel: 'high',
    },
  }, { merge: true });

  // Send welcome email if address available
  if (user.email) {
    await sendWelcomeEmail({
      to: user.email,
      userName: user.displayName || 'there',
    }).catch(console.error);
  }

  console.log(`Initialised user ${user.uid}`);
});
