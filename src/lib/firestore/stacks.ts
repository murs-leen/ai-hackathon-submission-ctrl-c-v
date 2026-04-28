import { collection, doc, setDoc, addDoc, updateDoc, getDocs, query, where, orderBy, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { StackItem } from '@/lib/types';

export async function getUserStacks(userId: string): Promise<StackItem[]> {
  const stacksRef = collection(db, 'users', userId, 'stacks');
  const q = query(stacksRef, where('isActive', '==', true), orderBy('addedAt', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as StackItem[];
}

export async function addStackItem(userId: string, item: Omit<StackItem, 'id'>): Promise<string> {
  const stacksRef = collection(db, 'users', userId, 'stacks');
  const docRef = await addDoc(stacksRef, {
    ...item,
    addedAt: serverTimestamp(),
    isActive: true
  });
  return docRef.id;
}

export async function updateStackItem(userId: string, itemId: string, updates: Partial<StackItem>): Promise<void> {
  const docRef = doc(db, 'users', userId, 'stacks', itemId);
  await updateDoc(docRef, updates);
}

// Full removal bypasses soft-delete if it's cleaner in Firestore UX
export async function deleteStackItem(userId: string, itemId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'stacks', itemId);
  await updateDoc(docRef, { isActive: false }); 
}

// In case users hard-delete
export async function destroyStackItem(userId: string, itemId: string): Promise<void> {
  const docRef = doc(db, 'users', userId, 'stacks', itemId);
  await deleteDoc(docRef);
}
