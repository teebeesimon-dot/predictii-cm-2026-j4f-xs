/**
 * Logică PURĂ de calcul al achievement-urilor și recordurilor personale.
 *
 * Nu face niciun apel Firestore — primește datele deja încărcate prin SWR
 * (users, matches, predictions) și întoarce starea calculată. Poate rula
 * atât client-side (Trophy Cabinet) cât și server-side (notification engine).
 */

import {
  scorePrediction,
  type AppUser,
  type Match,
  type Prediction,
} from '@/lib/types'
import { computeStandings } from '@/lib/data'
import { ACHIEVEMENT_DEFS } from '@/lib/achievements/definitions'
import type {
  AchievementState,
  PersonalRecords,
  StoredAchievements,
} from '@/lib/achievements/types'

// ---------------------------------------------------------------------------
// Metrici de bază (refolosite de mai multe achievement-uri)
// ---------------------------------------------------------------------------

export interface UserMetrics {
  totalPredictions: number
  totalExact: number
  totalCorrect1x2: number
  // Pronosticuri pe etapă: map stage → { exact, correct, total }
  byStage: Map<number, { exact: number; correct: number; total: number }>
  // Streak curent de etape cu cel puțin un scor corect (1x2 sau exact)
  stageStreak: number
  // Cel mai lung streak de etape cu cel puțin un scor corect
  longestStageStreak: number
  // Cel mai bun punctaj într-o etapă
  bestRoundPoints: number
  // Cele mai multe scoruri exacte într-o etapă
  mostExactInRound: number
  // Acuratețe maximă 1X2 obținută pe o etapă (0–100)
  maxStageAccuracy: number
}

export function computeUserMetrics(
  user: AppUser,
  matches: Match[],
  predictions: Prediction[],
): UserMetrics {
  const myPreds = predictions.filter((p) => p.userId === user.id)
  const predMap = new Map(myPreds.map((p) => [p.matchId, p]))

  // Meciuri finalizate (au scor oficial)
  const finished = matches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  )

  const byStage = new Map<number, { exact: number; correct: number; total: number }>()

  let totalExact = 0
  let totalCorrect = 0
  let totalPred = myPreds.length

  for (const m of finished) {
    const pred = predMap.get(m.id)
    if (!pred) continue
    const s = scorePrediction(pred, m)
    const stg = byStage.get(m.stage) ?? { exact: 0, correct: 0, total: 0 }
    stg.total += 1
    if (s === 3) {
      stg.exact += 1
      totalExact += 1
    } else if (s === 1) {
      stg.correct += 1
      totalCorrect += 1
    }
    byStage.set(m.stage, stg)
  }

  // Etape ordonate crescător (pentru calcul streak)
  const stageIds = [...byStage.keys()].sort((a, b) => a - b)
  let currentStreak = 0
  let longestStreak = 0
  let streak = 0

  for (const sid of stageIds) {
    const s = byStage.get(sid)!
    if (s.exact + s.correct > 0) {
      streak += 1
    } else {
      streak = 0
    }
    if (streak > longestStreak) longestStreak = streak
  }
  currentStreak = streak

  // Cel mai bun punctaj per etapă
  let bestRoundPoints = 0
  let mostExactInRound = 0
  let maxStageAccuracy = 0

  for (const [, s] of byStage) {
    const pts = s.exact * 3 + s.correct * 1
    if (pts > bestRoundPoints) bestRoundPoints = pts
    if (s.exact > mostExactInRound) mostExactInRound = s.exact
    if (s.total > 0) {
      const acc = ((s.exact + s.correct) / s.total) * 100
      if (acc > maxStageAccuracy) maxStageAccuracy = acc
    }
  }

  return {
    totalPredictions: totalPred,
    totalExact,
    totalCorrect1x2: totalCorrect,
    byStage,
    stageStreak: currentStreak,
    longestStageStreak: longestStreak,
    bestRoundPoints,
    mostExactInRound,
    maxStageAccuracy,
  }
}

// ---------------------------------------------------------------------------
// Rang în clasamentul general (refolosim computeStandings existent)
// ---------------------------------------------------------------------------

export function computeUserBestRank(
  userId: string,
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
): number | null {
  const rows = computeStandings(users, matches, predictions, undefined, {
    id: userId,
    isAdmin: false,
  })
  const me = rows.find((r) => r.userId === userId)
  return me ? me.rank : null
}

// ---------------------------------------------------------------------------
// Funcția principală: calculează toate achievement-urile unui user
// ---------------------------------------------------------------------------

export function computeAchievements(
  user: AppUser,
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
): AchievementState[] {
  const stored: StoredAchievements = (user as any).achievements ?? {
    unlocked: {},
  }
  const metrics = computeUserMetrics(user, matches, predictions)
  const currentRank = computeUserBestRank(user.id, users, matches, predictions)

  // Verifică dacă userul a participat la măcar o competiție (are cel puțin
  // un pronostic pe un meci finalizat).
  const hasParticipated = metrics.totalPredictions > 0

  // Calculează progresul per achievement.
  function getProgress(id: string): number {
    switch (id) {
      case 'first-prediction':
        return Math.min(1, metrics.totalPredictions)
      case 'first-exact':
        return Math.min(1, metrics.totalExact)
      case 'exact-5':
        return Math.min(5, metrics.totalExact)
      case 'exact-10':
        return Math.min(10, metrics.totalExact)
      case 'exact-25':
        return Math.min(25, metrics.totalExact)
      case 'predictions-100':
        return Math.min(100, metrics.totalPredictions)
      case 'predictions-500':
        return Math.min(500, metrics.totalPredictions)
      case 'predictions-1000':
        return Math.min(1000, metrics.totalPredictions)
      case 'top-10':
        return currentRank !== null && currentRank <= 10 ? 1 : 0
      case 'top-3':
        return currentRank !== null && currentRank <= 3 ? 1 : 0
      case 'champion':
        return currentRank === 1 ? 1 : 0
      case 'streak-5':
        return Math.min(5, metrics.longestStageStreak)
      case 'streak-10':
        return Math.min(10, metrics.longestStageStreak)
      case 'first-competition':
        return hasParticipated ? 1 : 0
      case 'accuracy-50':
        return metrics.maxStageAccuracy >= 50 ? 1 : 0
      case 'accuracy-75':
        return metrics.maxStageAccuracy >= 75 ? 1 : 0
      default:
        return 0
    }
  }

  return ACHIEVEMENT_DEFS.map((def) => {
    const progress = getProgress(def.id)
    const target = def.progressTarget ?? 1
    const unlocked = progress >= target
    const storedAt = stored.unlocked?.[def.id] ?? null

    return {
      def,
      unlocked,
      unlockedAt: unlocked ? (storedAt ?? Date.now()) : null,
      progress,
    }
  })
}

// ---------------------------------------------------------------------------
// Calcul recorduri personale
// ---------------------------------------------------------------------------

export function computePersonalRecords(
  user: AppUser,
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
): PersonalRecords {
  const metrics = computeUserMetrics(user, matches, predictions)
  const rank = computeUserBestRank(user.id, users, matches, predictions)

  // Comparăm cu ce era stocat înainte (dacă există) pentru a păstra recordul
  // histórico (ex. dacă a coborât în clasament după).
  const prev =
    ((user as any).achievements as StoredAchievements | undefined)
      ?.personalRecords ?? null

  return {
    highestRank:
      rank !== null
        ? prev?.highestRank !== undefined && prev.highestRank !== null
          ? Math.min(rank, prev.highestRank)
          : rank
        : prev?.highestRank ?? null,
    longestPredictionStreak: Math.max(
      metrics.longestStageStreak,
      prev?.longestPredictionStreak ?? 0,
    ),
    bestRoundPoints: Math.max(
      metrics.bestRoundPoints,
      prev?.bestRoundPoints ?? 0,
    ),
    mostExactInRound: Math.max(
      metrics.mostExactInRound,
      prev?.mostExactInRound ?? 0,
    ),
    updatedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Achievement-urile nou deblocate (față de starea stocată anterior)
// ---------------------------------------------------------------------------

export function findNewlyUnlocked(
  states: AchievementState[],
  stored: StoredAchievements,
): AchievementState[] {
  return states.filter(
    (s) => s.unlocked && !(s.def.id in (stored.unlocked ?? {})),
  )
}
