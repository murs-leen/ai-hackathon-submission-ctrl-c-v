import * as admin from 'firebase-admin';

admin.initializeApp();

// Scheduled functions (require Firebase Blaze plan)
export { dailyAnalysis } from './scheduled/daily-analysis';
export { weeklyDigest } from './scheduled/weekly-digest';

// Firestore triggered functions
export { onAlertCreated } from './triggers/on-alert-created';
export { onUserCreated } from './triggers/on-user-created';
