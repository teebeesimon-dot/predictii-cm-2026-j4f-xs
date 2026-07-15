// Helperi PURI pentru cardul de rezumat de pe Acasă (Faza 3).
//
// Operează pe datele deja încărcate în dashboard (matches/predictions/standings)
// — NU face nicio citire Firestore. Menține logica de rezumat separată de UI.

import { scorePrediction, type Match, type Prediction } from '@/lib/types'

export interface LatestMatchPoints {
  match: Match | null
  points: number | null
}

// Cel mai recent meci încheiat (cu scor) și punctele obținute de utilizator la
// el. Dacă nu există niciun meci încheiat sau niciun pronostic, points = null.
export function computeLatestMatchPoints(
  matches: Match[],
  predictions: Prediction[],
  userId: string | undefined,
): LatestMatchPoints {
  if (!userId) return { match: null, points: null }
  const finished = matches
    .filter((m) => m.homeScore !== null && m.awayScore !== null)
    .sort((a, b) => +new Date(b.kickoff) - +new Date(a.kickoff))
  const latest = finished[0] ?? null
  if (!latest) return { match: null, points: null }
  const pred = predictions.find(
    (p) => p.userId === userId && p.matchId === latest.id,
  )
  if (!pred) return { match: latest, points: null }
  return { match: latest, points: scorePrediction(pred, latest) }
}

// Variația de rang față de ultima poziție văzută. Pozitiv = urcare (rang mai
// mic acum), negativ = coborâre. null dacă nu avem un reper anterior.
export function computeRankDelta(
  currentRank: number,
  lastSeenRank: number | undefined,
): number | null {
  if (!lastSeenRank || currentRank <= 0) return null
  return lastSeenRank - currentRank
}
