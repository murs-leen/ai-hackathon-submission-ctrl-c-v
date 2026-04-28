import { collection, doc, addDoc, updateDoc, getDocs, query, orderBy, limit, serverTimestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AnalyzedAlert, AlertHistoryItem } from '@/lib/types';

export async function saveAlerts(userId: string, alerts: AnalyzedAlert[]): Promise<void> {
  const alertsRef = collection(db, 'users', userId, 'alerts');
  
  for (const alert of alerts) {
    await addDoc(alertsRef, {
      alert,
      status: 'pending',
      createdAt: serverTimestamp(),
      actedAt: null,
      savingsAchieved: null
    });
  }
}

export async function getPendingAlerts(userId: string): Promise<AnalyzedAlert[]> {
  const alertsRef = collection(db, 'users', userId, 'alerts');
  const q = query(alertsRef, where('status', '==', 'pending'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    ...doc.data().alert,
    dbId: doc.id
  })) as AnalyzedAlert[];
}

export async function getAlertHistory(userId: string, limitCount = 50): Promise<AlertHistoryItem[]> {
  const alertsRef = collection(db, 'users', userId, 'alerts');
  const q = query(alertsRef, orderBy('createdAt', 'desc'), limit(limitCount));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AlertHistoryItem[];
}

export async function markAlertActed(userId: string, alertId: string, savingsAchieved: number): Promise<void> {
  const docRef = doc(db, 'users', userId, 'alerts', alertId);
  await updateDoc(docRef, {
    status: 'acted',
    actedAt: serverTimestamp(),
    savingsAchieved
  });
}

export async function dismissAlert(userId: string, alertId: string, reason?: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'alerts', alertId);
  await updateDoc(docRef, {
    status: 'dismissed',
    dismissedAt: serverTimestamp(),
    dismissReason: reason || null
  });
}

export async function getTotalSavings(userId: string): Promise<number> {
  const alertsRef = collection(db, 'users', userId, 'alerts');
  const q = query(alertsRef, where('status', '==', 'acted'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.reduce((total, doc) => {
    return total + (doc.data().savingsAchieved || 0);
  }, 0);
}
