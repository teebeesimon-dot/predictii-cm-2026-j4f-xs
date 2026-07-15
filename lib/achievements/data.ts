/**
 * Persistență pentru achievements — scrie pe documentul `users` existent.
 * Un singur updateDoc la prima deblocare; nu creează colecții noi.
 */

import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { StoredAchievements } from '@/lib/achievements/types'

// Actualizează starea stocată pe document. Apelat doar când apar deblocări noi
// sau se actualizează recordurile personale.
export async function saveAchievements(
  userId: string,
  stored: StoredAchievements,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    achievements: stored,
  })
}

// Merge achievements: păstrează momentele de unlock existente, adaugă doar
// cele noi, nu suprascrie niciodată un unlock deja salvat.
export function mergeAchievements(
  existing: StoredAchievements,
  newUnlocks: Record<string, number>,
  personalRecords?: StoredAchievements['personalRecords'],
): StoredAchievements {
  return {
    unlocked: {
      ...existing.unlocked,
      ...newUnlocks,
    },
    personalRecords: personalRecords ?? existing.personalRecords,
  }
}
