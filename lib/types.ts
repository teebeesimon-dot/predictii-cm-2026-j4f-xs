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

// Runde din faza eliminatorie (doar pentru Etapa 5)
export type KnockoutRound = 'r16' | 'qf' | 'sf' | 'final'

export const KNOCKOUT_ROUNDS: { round: KnockoutRound; label: string }[] = [
  { round: 'r16', label: 'Optimi de finală' },
  { round: 'qf', label: 'Sferturi de finală' },
  { round: 'sf', label: 'Semifinale' },
  { round: 'final', label: 'Finala mare și finala mică' },
]

// Termenele limită pentru completarea pronosticurilor (ora României, vară = UTC+3).
// Stocate în UTC: ex. 20:00 RO = 17:00 UTC.
export const STAGE_DEADLINES: Record<Exclude<StageId, 5>, string> = {
  1: '2026-06-11T17:00:00.000Z', // diseară 20:00 RO
  2: '2026-06-18T15:00:00.000Z', // 18.06.2026 18:00 RO
  3: '2026-06-24T18:00:00.000Z', // 24.06.2026 21:00 RO
  4: '2026-06-28T18:00:00.000Z', // 28.06.2026 21:00 RO
}

// Etapa 5 are termene separate per rundă eliminatorie.
export const KNOCKOUT_DEADLINES: Record<KnockoutRound, string> = {
  r16: '2026-07-04T16:00:00.000Z', // 04.07.2026 19:00 RO
  qf: '2026-07-09T18:00:00.000Z', // 09.07.2026 21:00 RO
  sf: '2026-07-14T18:00:00.000Z', // 14.07.2026 21:00 RO
  final: '2026-07-19T16:00:00.000Z', // 19.07.2026 19:00 RO
}

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
  // True când utilizatorul trebuie să-și schimbe parola (prima logare sau
  // după ce adminul i-a resetat parola). Forțează ecranul de schimbare parolă.
  mustChangePassword?: boolean
  // Cont de supraveghere: poate vedea totul, dar NU poate trimite pronosticuri
  // și nu apare nicăieri (clasamente, colegi). Tipic pentru un admin observator.
  viewOnly?: boolean
  // Jucător ascuns din clasamente pentru ceilalți participanți. Rămâne vizibil
  // în pagina „Colegii" și se vede pe sine (plus adminii îl văd) în clasamente.
  hideFromStandings?: boolean
}

// Resolve admin status from either the boolean flag or the role string.
export function isUserAdmin(u: Pick<AppUser, 'isAdmin' | 'role'>): boolean {
  return u.isAdmin === true || u.role === 'admin'
}

// Cont de supraveghere (observator): nu pronostichează și e ascuns peste tot.
export function isViewOnly(u: Pick<AppUser, 'viewOnly'>): boolean {
  return u.viewOnly === true
}

export interface Match {
  id: string
  stage: StageId
  // Doar pentru Etapa 5: runda eliminatorie (decide termenul limită)
  round?: KnockoutRound
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

// Termenul limită de completare pentru un meci (în funcție de etapă/rundă).
export function getDeadline(
  match: Pick<Match, 'stage' | 'round'>,
): string | null {
  if (match.stage === 5) {
    if (match.round) return KNOCKOUT_DEADLINES[match.round]
    return null
  }
  return STAGE_DEADLINES[match.stage as Exclude<StageId, 5>] ?? null
}

// Un meci este blocat când termenul limită al etapei/rundei a trecut.
// Dacă nu există termen definit (ex. rundă eliminatorie nesetată), folosim
// ora de start a meciului ca rezervă de siguranță.
export function isLocked(match: Pick<Match, 'stage' | 'round' | 'kickoff'>): boolean {
  const deadline = getDeadline(match)
  const limit = deadline ? new Date(deadline).getTime() : new Date(match.kickoff).getTime()
  return Date.now() >= limit
}

// Etapa activă = prima etapă (1→5) al cărei termen limită nu a trecut încă.
// Pentru Etapa 5 folosim ultimul termen al rundelor eliminatorii (finala).
// Dacă toate au trecut, întoarce ultima etapă (5).
export function getActiveStage(): StageId {
  const now = Date.now()
  for (const id of [1, 2, 3, 4] as const) {
    if (now < new Date(STAGE_DEADLINES[id]).getTime()) return id
  }
  return 5
}

// Termenul limită activ pentru o etapă (Etapa 5 → următoarea rundă neexpirată).
export function getStageDeadline(stage: StageId): string | null {
  if (stage !== 5) return STAGE_DEADLINES[stage as Exclude<StageId, 5>] ?? null
  const now = Date.now()
  for (const { round } of KNOCKOUT_ROUNDS) {
    if (now < new Date(KNOCKOUT_DEADLINES[round]).getTime()) {
      return KNOCKOUT_DEADLINES[round]
    }
  }
  return KNOCKOUT_DEADLINES.final
}
