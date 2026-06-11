// Etapele turneului (tournament rounds)
export const STAGES = [
  { id: 1, name: 'Etapa 1', short: 'E1', label: 'Faza grupelor - Runda 1' },
  { id: 2, name: 'Etapa 2', short: 'E2', label: 'Faza grupelor - Runda 2' },
  { id: 3, name: 'Etapa 3', short: 'E3', label: 'Faza grupelor - Runda 3' },
  { id: 4, name: 'Etapa 4', short: 'E4', label: 'Saisprezecimi (Round of 32)' },
  {
    id: 5,
    name: 'Etapa 5',
    short: 'E5',
    label: 'Faza eliminatorie (optimi → finală, inclusiv finala mică)',
  },
] as const

export type StageId = 1 | 2 | 3 | 4 | 5

// Participanți fixați ai ligii J4F
export const PARTICIPANTS = [
  'Simon Tiberiu',
  'Danu Claudiu',
  'Beta Bogdan',
  'Visan Alex',
  'Gosav Denis',
  'Radu Emilian',
  'Corbu Marius',
  'Lia Dan',
  'Bucs David',
  'Harabagiu Alex',
] as const

export interface AppUser {
  id: string
  username: string
  // Full display name (e.g. "Simon Tiberiu")
  name: string
  password: string
  // Some documents use a boolean `isAdmin`, others a `role` string. Both are
  // supported; use `isUserAdmin()` to resolve admin status reliably.
  isAdmin?: boolean
  role?: 'user' | 'admin'
  createdAt?: number
}

// Resolve admin status from either the boolean flag or the role string.
export function isUserAdmin(u: Pick<AppUser, 'isAdmin' | 'role'>): boolean {
  return u.isAdmin === true || u.role === 'admin'
}

export interface Match {
  id: string
  stage: StageId
  homeTeam: string
  awayTeam: string
  // ISO string of kickoff time
  kickoff: string
  // official result (null until admin enters it)
  homeScore: number | null
  awayScore: number | null
}

export interface Prediction {
  // doc id is `${userId}_${matchId}`
  id: string
  userId: string
  matchId: string
  homeScore: number
  awayScore: number
  updatedAt: number
}

export interface AwardEntry {
  stage: StageId | 'overall'
  winnerUserId: string | null
  winnerUsername: string | null
  points: number
}

// 1X2 outcome from a scoreline
export function outcome(home: number, away: number): 'H' | 'D' | 'A' {
  if (home > away) return 'H'
  if (home < away) return 'A'
  return 'D'
}

// Scoring: exact = 3, correct 1X2 = 1, wrong = 0
export function scorePrediction(
  pred: { homeScore: number; awayScore: number } | null | undefined,
  match: Pick<Match, 'homeScore' | 'awayScore'>,
): number {
  if (!pred) return 0
  if (match.homeScore === null || match.awayScore === null) return 0
  if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) {
    return 3
  }
  if (outcome(pred.homeScore, pred.awayScore) === outcome(match.homeScore, match.awayScore)) {
    return 1
  }
  return 0
}

export function isLocked(match: Pick<Match, 'kickoff'>): boolean {
  return new Date(match.kickoff).getTime() <= Date.now()
}
