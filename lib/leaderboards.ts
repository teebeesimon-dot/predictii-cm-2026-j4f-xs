/**
 * Clasamente extinse (Faza 4 – Gamification).
 *
 * Toate funcțiile sunt PURE — primesc datele deja încărcate prin SWR și întorc
 * rânduri sortate. Nu fac nicio citire Firestore.
 */

import {
  scorePrediction,
  type AppUser,
  type Match,
  type Prediction,
} from '@/lib/types'
import { isViewOnly, isDedicatedAdmin } from '@/lib/types'

// ---------------------------------------------------------------------------
// Tipuri comune
// ---------------------------------------------------------------------------

export interface LeaderboardRow {
  userId: string
  name: string
  username: string
  rank: number
  value: number
  // Câmp secundar opțional (ex. acuratețe → afișăm și total meciuri).
  secondary?: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function eligibleUsers(
  users: AppUser[],
  viewer?: { id?: string; isAdmin?: boolean },
) {
  return users.filter((u) => {
    if (isViewOnly(u)) return false
    if (isDedicatedAdmin(u)) return false
    if (u.hideFromStandings) {
      if (!viewer?.isAdmin && viewer?.id !== u.id) return false
    }
    return true
  })
}

function assignRanks(
  rows: Omit<LeaderboardRow, 'rank'>[],
): LeaderboardRow[] {
  let lastVal: number | null = null
  let lastRank = 0
  return rows.map((row, i) => {
    let rank: number
    if (lastVal !== null && row.value === lastVal) {
      rank = lastRank
    } else {
      rank = i + 1
      lastRank = rank
      lastVal = row.value
    }
    return { ...row, rank }
  })
}

// ---------------------------------------------------------------------------
// 1. Clasament scoruri exacte
// ---------------------------------------------------------------------------

export function computeExactScoresLeaderboard(
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
  viewer?: { id?: string; isAdmin?: boolean },
): LeaderboardRow[] {
  const eligible = eligibleUsers(users, viewer)
  const finished = matches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  )
  const predMap = new Map(predictions.map((p) => [`${p.userId}_${p.matchId}`, p]))

  const rows: Omit<LeaderboardRow, 'rank'>[] = eligible.map((u) => {
    let exact = 0
    let played = 0
    for (const m of finished) {
      const pred = predMap.get(`${u.id}_${m.id}`)
      if (!pred) continue
      played++
      if (scorePrediction(pred, m) === 3) exact++
    }
    return {
      userId: u.id,
      name: u.name || u.username,
      username: u.username,
      value: exact,
      secondary: played,
    }
  })

  rows.sort(
    (a, b) =>
      b.value - a.value ||
      a.name.localeCompare(b.name),
  )

  return assignRanks(rows)
}

// ---------------------------------------------------------------------------
// 2. Clasament acuratețe 1X2 (pronosticuri corecte / meciuri jucate, %)
//    Minim 10 meciuri jucate pentru a fi eligibil.
// ---------------------------------------------------------------------------

const MIN_PLAYED_FOR_ACCURACY = 5

export function computeAccuracyLeaderboard(
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
  viewer?: { id?: string; isAdmin?: boolean },
): LeaderboardRow[] {
  const eligible = eligibleUsers(users, viewer)
  const finished = matches.filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  )
  const predMap = new Map(predictions.map((p) => [`${p.userId}_${p.matchId}`, p]))

  const rows: Omit<LeaderboardRow, 'rank'>[] = []

  for (const u of eligible) {
    let correct = 0
    let played = 0
    for (const m of finished) {
      const pred = predMap.get(`${u.id}_${m.id}`)
      if (!pred) continue
      played++
      const s = scorePrediction(pred, m)
      if (s > 0) correct++
    }
    if (played < MIN_PLAYED_FOR_ACCURACY) continue
    rows.push({
      userId: u.id,
      name: u.name || u.username,
      username: u.username,
      // Procentaj cu 1 zecimală (ex. 713 = 71.3%)
      value: Math.round((correct / played) * 1000) / 10,
      secondary: played,
    })
  }

  rows.sort(
    (a, b) =>
      b.value - a.value ||
      (b.secondary ?? 0) - (a.secondary ?? 0) ||
      a.name.localeCompare(b.name),
  )

  return assignRanks(rows)
}

// ---------------------------------------------------------------------------
// 3. Clasament lunar (meciuri din ultima lună calendaristică)
// ---------------------------------------------------------------------------

export function computeMonthlyLeaderboard(
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
  viewer?: { id?: string; isAdmin?: boolean },
  referenceDate?: Date,
): LeaderboardRow[] {
  const ref = referenceDate ?? new Date()
  // Prima zi a lunii curente
  const startOfMonth = new Date(ref.getFullYear(), ref.getMonth(), 1).getTime()
  const endOfMonth = new Date(
    ref.getFullYear(),
    ref.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  ).getTime()

  const monthly = matches.filter((m) => {
    const kickoff = new Date(m.kickoff).getTime()
    return (
      kickoff >= startOfMonth &&
      kickoff <= endOfMonth &&
      m.homeScore !== null &&
      m.awayScore !== null
    )
  })

  if (monthly.length === 0) return []

  const eligible = eligibleUsers(users, viewer)
  const predMap = new Map(predictions.map((p) => [`${p.userId}_${p.matchId}`, p]))

  const rows: Omit<LeaderboardRow, 'rank'>[] = eligible.map((u) => {
    let points = 0
    for (const m of monthly) {
      const pred = predMap.get(`${u.id}_${m.id}`)
      if (!pred) continue
      points += scorePrediction(pred, m)
    }
    return {
      userId: u.id,
      name: u.name || u.username,
      username: u.username,
      value: points,
      secondary: monthly.length,
    }
  })

  rows.sort(
    (a, b) =>
      b.value - a.value ||
      a.name.localeCompare(b.name),
  )

  return assignRanks(rows)
}

// ---------------------------------------------------------------------------
// 4. Clasament per competiție / ediție (refolosește computeStandings indirect)
//    Returnează datele din computeStandings ca LeaderboardRow.
// ---------------------------------------------------------------------------

import { computeStandings } from '@/lib/data'

export function computeCompetitionLeaderboard(
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
  viewer?: { id?: string; isAdmin?: boolean },
): LeaderboardRow[] {
  const rows = computeStandings(users, matches, predictions, undefined, viewer)
  return rows.map((r) => ({
    userId: r.userId,
    name: r.name,
    username: r.username,
    rank: r.rank,
    value: r.points,
    secondary: r.exact,
  }))
}
