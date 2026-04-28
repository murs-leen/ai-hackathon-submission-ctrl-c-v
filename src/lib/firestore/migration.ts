import { getUserStacks, addStackItem } from './stacks';
import { getAlertHistory, dismissAlert } from './alerts';
import { getSavedScenarios } from './scenarios';
import { StackItem } from '@/lib/types';

export async function migrateLocalStorageToFirestore(userId: string): Promise<boolean> {
  try {
    const existingStacks = await getUserStacks(userId);
    if (existingStacks.length > 0) return true; // Account historically exists

    const localStack = localStorage.getItem('stack-sentinel:stack') || localStorage.getItem('stack');
    if (!localStack) return true; // No local setup = nothing to migrate

    const stackItems: Omit<StackItem, 'id'>[] = JSON.parse(localStack);
    for (const item of stackItems) {
      await addStackItem(userId, {
        name: item.name,
        category: item.category,
        monthlyCost: item.monthlyCost
      });
    }

    // Let them decide if they want to physically delete the localStorage afterwards UI-side
    return false; // False meaning "we migrated fresh locally" for UI triggers
  } catch (err) {
    console.error('Migration execution failed', err);
    throw err;
  }
}
