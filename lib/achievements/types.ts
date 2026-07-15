/**
 * Tipuri pentru sistemul de achievements (Faza 4 – Gamification).
 *
 * Achievements sunt calculate EXCLUSIV din datele deja încărcate prin SWR
 * (users, matches, predictions) — zero citiri Firestore suplimentare.
 * Starea de unlock se scrie o singură dată pe `users.achievements` (un câmp
 * aditional pe documentul existent) la prima deblocare.
 */

// Raritate: influențează culoarea și iconița medaliei.
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

// Tipul de medalie acordat la deblocare.
export type MedalType = 'bronze' | 'silver' | 'gold' | 'none'

/** Definiția statică a unui achievement (nu depinde de user). */
export interface AchievementDef {
  id: string
  // Titlul afișat în Trophy Cabinet.
  title: string
  // Descriere scurtă.
  description: string
  // Iconiță (nume lucide-react).
  icon: string
  rarity: AchievementRarity
  medal: MedalType
  // Dacă are progress (ex. „7/10 scoruri exacte"), altfel e binar (unlock/locked).
  progressTarget?: number
  // Eticheta unității de progress (ex. „scoruri exacte", „pronosticuri").
  progressLabel?: string
  // Categoria notificării de milestone asociată (opțional).
  notificationCategory?: string
}

/** Starea calculată a unui achievement pentru un user specific. */
export interface AchievementState {
  def: AchievementDef
  unlocked: boolean
  // Momentul primei deblocări (epoch ms). null = niciodată deblocat.
  unlockedAt: number | null
  // Progres curent (0 dacă nu are progressTarget).
  progress: number
}

/** Recorduri personale ale unui utilizator. */
export interface PersonalRecords {
  // Cea mai bună poziție în clasamentul general (1 = primul).
  highestRank: number | null
  // Cel mai lung streak de pronosticuri consecutive (zile/meciuri succesive cu
  // cel puțin un pronostic corect 1x2 sau exact).
  longestPredictionStreak: number
  // Cel mai bun punctaj într-o etapă.
  bestRoundPoints: number
  // Cele mai multe scoruri exacte într-o etapă.
  mostExactInRound: number
  // Ultima actualizare (epoch ms).
  updatedAt: number
}

/** Ce se stochează pe documentul `users` (câmpul `achievements`). */
export interface StoredAchievements {
  // achievement_id → epoch ms al primei deblocări
  unlocked: Record<string, number>
  // Ultimul update al recordurilor personale
  personalRecords?: PersonalRecords
}
