import { collection, addDoc, getDocs, doc, deleteDoc, serverTimestamp, query, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { SavedScenario } from '@/lib/types';

export async function getSavedScenarios(userId: string): Promise<SavedScenario[]> {
  const scenariosRef = collection(db, 'users', userId, 'scenarios');
  const q = query(scenariosRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  })) as SavedScenario[];
}

export async function addSavedScenario(userId: string, scenario: Omit<SavedScenario,'id'>): Promise<string> {
  const scenariosRef = collection(db, 'users', userId, 'scenarios');
  const docRef = await addDoc(scenariosRef, {
    ...scenario,
    createdAt: serverTimestamp(),
    isApplied: false
  });
  return docRef.id;
}

export async function markScenarioApplied(userId: string, scenarioId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'scenarios', scenarioId);
  await updateDoc(docRef, { isApplied: true });
}

export async function deleteSavedScenario(userId: string, scenarioId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'scenarios', scenarioId);
  await deleteDoc(docRef);
}
