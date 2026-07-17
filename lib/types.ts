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

// Identificatorul etapei. Numărul de etape diferă per competiție (World Cup =
// 5, Champions League = 11), deci tipul este generic `number`. Definițiile
// concrete de etape sunt în lib/stages.ts, per competiție.
export type StageId = number

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
// Termenul fiecărei runde = înainte de PRIMUL meci al rundei.
// Finala mică (locul 3) e sâmbătă 18.07 la 22:00 RO → termenul e vineri 17.07.
// Finala mare e duminică 19.07 la 22:00 RO, dar pronosticurile se blochează
// la același termen cu finala mică (un singur deadline comun pentru ambele).
export const KNOCKOUT_DEADLINES: Record<KnockoutRound, string> = {
  r16: '2026-07-04T16:00:00.000Z', // 04.07.2026 19:00 RO (înainte de primul r16 sâm 04.07)
  qf: '2026-07-09T18:00:00.000Z', // 09.07.2026 21:00 RO (înainte de primul sf joi 09.07)
  sf: '2026-07-14T18:00:00.000Z', // 14.07.2026 21:00 RO (înainte de SF1 mar 14.07)
  final: '2026-07-17T18:00:00.000Z', // 17.07.2026 21:00 RO (vineri, înainte de finala mică sâm 18.07 22:00 RO)
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
  // Acces per ediție (cheie = editionId). La edițiile noi nimeni nu are acces
  // până când adminul nu bifează explicit. Ediția World Cup 2026 (cea existentă)
  // este accesibilă implicit tuturor (vezi hasEditionAccess).
  access?: Record<string, boolean>
  // Token-uri Firebase Cloud Messaging pentru dispozitivele acestui utilizator
  // (Android/iOS prin Capacitor). Un user poate avea mai multe dispozitive.
  fcmTokens?: string[]
  // Ultima actualizare a listei de token-uri FCM (epoch ms).
  fcmUpdatedAt?: number
  // Preferințe personale (Faza 3 – experiență & implicare). Stocate pe același
  // document `users`, deci NU necesită o colecție nouă și „călătoresc" cu
  // datele deja încărcate prin useUsers() (zero citiri suplimentare).
  preferences?: UserPreferences
}

// Categoriile de notificări pe care utilizatorul le poate configura
// independent (push și in-app separat). String-uri stabile, folosite drept
// chei atât pe client (Centrul de notificări), cât și pe server (engine).
export type NotificationCategory =
  | 'deadline' // reamintiri termen limită pronosticuri
  | 'matchStarted' // meci început
  | 'matchFinished' // meci încheiat
  | 'standings' // schimbări de clasament
  | 'announcements' // anunțuri competiție (etapă nouă etc.)
  | 'resume' // mesaje de tip „rezumat" pe Acasă
  | 'general' // notificări generale / diverse

export const NOTIFICATION_CATEGORIES: {
  id: NotificationCategory
  label: string
  description: string
}[] = [
  {
    id: 'deadline',
    label: 'Reamintiri termen limită',
    description: 'Când se apropie închiderea pronosticurilor unei etape.',
  },
  {
    id: 'matchStarted',
    label: 'Meci început',
    description: 'Când începe un meci pentru care ai pronostic.',
  },
  {
    id: 'matchFinished',
    label: 'Meci încheiat',
    description: 'Când se încheie un meci și se actualizează scorul.',
  },
  {
    id: 'standings',
    label: 'Schimbări de clasament',
    description: 'Când poziția ta în clasament se modifică.',
  },
  {
    id: 'announcements',
    label: 'Anunțuri competiție',
    description: 'Etapă nouă deschisă și alte anunțuri importante.',
  },
  {
    id: 'resume',
    label: 'Rezumate Acasă',
    description: 'Cardul de rezumat afișat la deschiderea aplicației.',
  },
  {
    id: 'general',
    label: 'Notificări generale',
    description: 'Mesaje generale trimise de administratori.',
  },
]

// Preferințele per-canal: fiecare categorie poate fi pornită/oprită. Absența
// unei valori înseamnă „activat" (opt-out, nu opt-in) — comportamentul implicit
// rămâne identic cu cel dinainte de introducerea preferințelor.
export interface NotificationChannelPreferences {
  push?: Partial<Record<NotificationCategory, boolean>>
  inApp?: Partial<Record<NotificationCategory, boolean>>
  // Chei de notificări marcate individual ca citite (Centrul de notificări).
  readKeys?: string[]
  // Tot ce a fost trimis înainte de acest moment e considerat citit
  // („marchează toate ca citite").
  readAllBefore?: number
  // Chei ascunse din listă („șterge notificările citite").
  clearedKeys?: string[]
}

export interface UserPreferences {
  // Cardul de rezumat de pe Acasă este vizibil? Implicit true.
  showResumeCard?: boolean
  // Echipa favorită (opțional), afișată pe profil.
  favouriteTeam?: string
  // Nume afișat opțional, distinct de `name` (ex. poreclă). Gol → se folosește
  // `name`.
  displayName?: string
  // Ultima poziție de clasament văzută (pentru „schimbare rang" pe rezumat).
  lastSeenRank?: number
  lastSeenRankAt?: number
  // Preferințe de notificări (push/in-app) + stare de citire.
  notifications?: NotificationChannelPreferences
}

// Ediția implicită / existentă, accesibilă tuturor fără bifare specială.
export const DEFAULT_EDITION_ID = 'wc-2026'

// Determină dacă un utilizator are acces la o ediție. Adminii au mereu acces.
// Ediția existentă (wc-2026) e accesibilă tuturor dacă nu e blocată explicit.
// Edițiile noi necesită bifare explicită (access[editionId] === true).
export function hasEditionAccess(
  u: Pick<AppUser, 'isAdmin' | 'role' | 'access'>,
  editionId: string,
): boolean {
  if (isUserAdmin(u)) return true
  const explicit = u.access?.[editionId]
  if (editionId === DEFAULT_EDITION_ID) return explicit !== false
  return explicit === true
}

// Resolve admin status from either the boolean flag or the role string.
export function isUserAdmin(u: Pick<AppUser, 'isAdmin' | 'role'>): boolean {
  return u.isAdmin === true || u.role === 'admin'
}

// Cont de supraveghere (observator): nu pronostichează și e ascuns peste tot.
export function isViewOnly(u: Pick<AppUser, 'viewOnly'>): boolean {
  return u.viewOnly === true
}

// Contul de administrare DEDICAT (nu joacă): username „admin” / nume
// „Administrator”. Acesta e singurul cont exclus din listele de participanți.
// ATENȚIE: un admin care e și jucător (ex. Simon) NU intră aici — el trebuie să
// apară în pronosticuri, clasamente și uneltele de admin, ca orice participant.
export function isDedicatedAdmin(
  u: Pick<AppUser, 'username' | 'name'>,
): boolean {
  return (
    u.username === 'admin' || (u.name ?? '').toLowerCase() === 'administrator'
  )
}

export interface Match {
  id: string
  // Ediția (competiție + an) căreia îi aparține meciul. Documentele mai vechi
  // nu au acest câmp și sunt tratate implicit ca ediția World Cup 2026.
  editionId?: string
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
  // Setat true când adminul introduce/corectează scorul manual. Sincronizarea
  // automată NU suprascrie meciurile marcate astfel (furnizorul poate avea
  // scorul greșit). Resetat la false când scorul e șters din admin.
  scoreOverride?: boolean
}

export interface Prediction {
  // doc id is `${userId}_${matchId}`
  id: string
  userId: string
  matchId: string
  // Ediția căreia îi aparține pronosticul (derivată din meci). Documentele mai
  // vechi nu au acest câmp și sunt tratate implicit ca World Cup 2026.
  editionId?: string
  homeScore: number
  awayScore: number
  updatedAt: number
  // Setat true când un administrator introduce/corectează manual pronosticul
  // în locul participantului (ex. userul a uitat să salveze un meci). Se
  // afișează transparent tuturor, ca să se știe că nu a fost pus de jucător.
  editedByAdmin?: boolean
  // Numele administratorului care a făcut modificarea (pentru transparență).
  editedByAdminName?: string
  // Momentul ultimei modificări făcute de admin.
  editedAt?: number
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

// Etapa „live" pentru clasamentul în desfășurare: cea mai avansată etapă care
// are deja cel puțin un meci început (kickoff <= acum). Spre deosebire de
// getActiveStage() — care vizează termenul de pronostic și sare la etapa
// următoare imediat ce termenul curent expiră — aceasta reflectă etapa care se
// joacă efectiv acum. Dacă niciun meci nu a început, întoarce prima etapă.
export function getLiveStage(matches: { stage: StageId; kickoff: string }[]): StageId {
  const now = Date.now()
  let live: StageId | null = null
  for (const m of matches) {
    if (new Date(m.kickoff).getTime() <= now) {
      if (live === null || m.stage > live) live = m.stage
    }
  }
  return live ?? 1
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
