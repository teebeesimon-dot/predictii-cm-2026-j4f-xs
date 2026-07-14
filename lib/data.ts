import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  orderBy,
  query,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AppUser, Match, Prediction, StageId } from '@/lib/types'
import {
  scorePrediction,
  PARTICIPANTS,
  isViewOnly,
  DEFAULT_EDITION_ID,
  hasEditionAccess,
} from '@/lib/types'
import { WC2026_GROUP_MATCHES } from '@/lib/wc2026-schedule'

// Parola implicită atribuită fiecărui participant la creare. Folosită și pentru
// a detecta conturile mai vechi care nu și-au schimbat încă parola.
export const DEFAULT_PASSWORD = 'cm2026'

// Ediția unui document (meci/pronostic): documentele mai vechi nu au câmpul
// editionId și aparțin ediției existente World Cup 2026.
function editionOf(doc: { editionId?: string }): string {
  return doc.editionId ?? DEFAULT_EDITION_ID
}

// Toate meciurile unei ediții. Dacă editionId lipsește, întoarce toate
// meciurile (folosit doar la sincronizare/migrare internă).
export async function getMatches(editionId?: string): Promise<Match[]> {
  const q = query(collection(db, 'matches'), orderBy('kickoff', 'asc'))
  const snap = await getDocs(q)
  const all = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Match, 'id'>),
  }))
  if (!editionId) return all
  return all.filter((m) => editionOf(m) === editionId)
}

export async function getUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppUser, 'id'>) }))
}

// Id-urile edițiilor care au cel puțin un meci încărcat. Edițiile fără meciuri
// sunt ascunse jucătorilor (selectorul le afișează doar adminilor).
export async function getAvailableEditionIds(): Promise<string[]> {
  const snap = await getDocs(collection(db, 'matches'))
  const set = new Set<string>()
  snap.docs.forEach((d) => {
    const data = d.data() as Omit<Match, 'id'>
    set.add(editionOf(data))
  })
  return Array.from(set)
}

export async function getAllPredictions(
  editionId?: string,
): Promise<Prediction[]> {
  const snap = await getDocs(collection(db, 'predictions'))
  const all = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Prediction, 'id'>),
  }))
  if (!editionId) return all
  return all.filter((p) => editionOf(p) === editionId)
}

export async function getUserPredictions(
  userId: string,
  editionId?: string,
): Promise<Prediction[]> {
  const all = await getAllPredictions(editionId)
  return all.filter((p) => p.userId === userId)
}

export class PredictionLockedError extends Error {
  constructor(message = 'Meciul a început deja. Pronosticul nu mai poate fi modificat.') {
    super(message)
    this.name = 'PredictionLockedError'
  }
}

export async function savePrediction(
  userId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  // Backend guard: conturile de supraveghere nu pot trimite pronosticuri.
  const userSnap = await getDoc(doc(db, 'users', userId))
  const userData = userSnap.exists()
    ? (userSnap.data() as Omit<AppUser, 'id'>)
    : null
  if (userData && isViewOnly(userData)) {
    throw new Error('Contul de supraveghere nu poate trimite pronosticuri.')
  }
  // Backend guard: never trust the UI. A prediction cannot be saved or changed
  // once the match has kicked off (kickoff <= now).
  const snap = await getDoc(doc(db, 'matches', matchId))
  if (!snap.exists()) {
    throw new Error('Meciul nu există.')
  }
  const match = snap.data() as Omit<Match, 'id'>
  const editionId = editionOf(match)

  // Backend guard: utilizatorul trebuie să aibă acces la ediția meciului.
  if (userData && !hasEditionAccess(userData, editionId)) {
    throw new Error('Nu ai acces la această competiție.')
  }
  if (new Date(match.kickoff).getTime() <= Date.now()) {
    throw new PredictionLockedError()
  }

  const id = `${userId}_${matchId}`
  await setDoc(doc(db, 'predictions', id), {
    userId,
    matchId,
    editionId,
    homeScore,
    awayScore,
    updatedAt: Date.now(),
  })
}

export async function createMatch(data: Omit<Match, 'id'>): Promise<void> {
  const id = doc(collection(db, 'matches')).id
  await setDoc(doc(db, 'matches', id), data)
}

export async function deleteMatch(matchId: string): Promise<void> {
  await deleteDoc(doc(db, 'matches', matchId))
}

// Seed all 72 group-stage matches if none exist yet. Returns the number added.
export async function seedGroupMatchesIfEmpty(): Promise<number> {
  const existing = await getMatches(DEFAULT_EDITION_ID)
  if (existing.length > 0) return 0

  const batch = writeBatch(db)
  for (const m of WC2026_GROUP_MATCHES) {
    const ref = doc(collection(db, 'matches'))
    batch.set(ref, { ...m, editionId: DEFAULT_EDITION_ID })
  }
  await batch.commit()
  return WC2026_GROUP_MATCHES.length
}

// Înlocuiește numele-placeholder ale barajelor cu echipele reale calificate,
// în meciurile DEJA existente (nu atinge scorurile sau pronosticurile).
const PLAYOFF_NAME_FIXES: Record<string, string> = {
  'Baraj UEFA A': 'Bosnia și Herțegovina',
  'Baraj UEFA B': 'Suedia',
  'Baraj UEFA C': 'Turcia',
  'Baraj UEFA D': 'Cehia',
  'Baraj FIFA 1': 'RD Congo',
  'Baraj FIFA 2': 'Irak',
}

export async function fixPlayoffTeamNames(): Promise<number> {
  const matches = await getMatches()
  const batch = writeBatch(db)
  let updated = 0
  for (const m of matches) {
    const newHome = PLAYOFF_NAME_FIXES[m.homeTeam]
    const newAway = PLAYOFF_NAME_FIXES[m.awayTeam]
    if (!newHome && !newAway) continue
    const patch: Partial<Match> = {}
    if (newHome) patch.homeTeam = newHome
    if (newAway) patch.awayTeam = newAway
    batch.update(doc(db, 'matches', m.id), patch)
    updated += 1
  }
  if (updated > 0) await batch.commit()
  return updated
}

// Cheie neordonată pentru o pereche de echipe (ignoră gazdă/oaspete și
// diacriticele), astfel încât un meci să fie identificat unic indiferent de
// ordinea în care sunt trecute echipele.
function pairKey(a: string, b: string): string {
  const norm = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  return [norm(a), norm(b)].sort().join('::')
}

// Re-sincronizează meciurile existente cu programul OFICIAL corect.
//
// Mapează după PERECHEA de echipe (unică în faza grupelor — fiecare pereche se
// întâlnește o singură dată), nu după ora de start. Astfel putem corecta și
// data/ora greșită, nu doar ordinea echipelor. Pentru fiecare meci existent
// actualizăm `kickoff`, `stage` și orientarea gazdă/oaspete ca să corespundă
// programului oficial. Id-urile documentelor, scorurile și pronosticurile rămân
// neatinse (sunt legate de id-ul meciului, nu de oră).
export async function resyncMatchTeams(): Promise<number> {
  const matches = await getMatches()

  // Index al programului corect după perechea de echipe.
  const programByPair = new Map<string, Omit<Match, 'id'>>()
  for (const m of WC2026_GROUP_MATCHES) {
    programByPair.set(pairKey(m.homeTeam, m.awayTeam), m)
  }

  const batch = writeBatch(db)
  let updated = 0
  for (const m of matches) {
    const correct = programByPair.get(pairKey(m.homeTeam, m.awayTeam))
    if (!correct) continue

    const sameOrientation = m.homeTeam === correct.homeTeam
    const needsUpdate =
      m.kickoff !== correct.kickoff ||
      m.stage !== correct.stage ||
      !sameOrientation

    if (!needsUpdate) continue

    const patch: Partial<Match> = {
      kickoff: correct.kickoff,
      stage: correct.stage,
      homeTeam: correct.homeTeam,
      awayTeam: correct.awayTeam,
    }

    // Dacă ordinea gazdă/oaspete s-a inversat, inversăm și scorul deja salvat
    // ca să rămână corect față de noua orientare.
    if (!sameOrientation) {
      patch.homeScore = m.awayScore
      patch.awayScore = m.homeScore
    }

    batch.update(doc(db, 'matches', m.id), patch)
    updated += 1
  }
  if (updated > 0) await batch.commit()
  return updated
}

function slugifyUsername(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
}

export async function createUser(
  name: string,
  username: string,
  password: string,
  isAdmin = false,
): Promise<void> {
  const uname = username.trim().toLowerCase()
  const id = doc(collection(db, 'users')).id
  await setDoc(doc(db, 'users', id), {
    name: name.trim(),
    username: uname,
    password,
    isAdmin,
    createdAt: Date.now(),
    // Parola inițială este una implicită → utilizatorul trebuie s-o schimbe
    // la prima autentificare.
    mustChangePassword: true,
  })
}

export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId))
}

// Actualizează drepturile de acces / vizibilitatea unui utilizator (setate de
// admin): cont de supraveghere (viewOnly) și/sau ascuns din clasamente
// (hideFromStandings).
export async function updateUserAccess(
  userId: string,
  access: { viewOnly?: boolean; hideFromStandings?: boolean },
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), access)
}

// Salvează un token Firebase Cloud Messaging în documentul utilizatorului.
// Folosește arrayUnion, deci e idempotent (nu adaugă duplicate) și suportă mai
// multe dispozitive per utilizator.
export async function saveFcmToken(
  userId: string,
  token: string,
): Promise<void> {
  if (!userId || !token) return
  await updateDoc(doc(db, 'users', userId), {
    fcmTokens: arrayUnion(token),
    fcmUpdatedAt: Date.now(),
  })
}

// Elimină un token FCM (ex. la delogare sau când tokenul devine invalid).
export async function removeFcmToken(
  userId: string,
  token: string,
): Promise<void> {
  if (!userId || !token) return
  await updateDoc(doc(db, 'users', userId), {
    fcmTokens: arrayRemove(token),
    fcmUpdatedAt: Date.now(),
  })
}

// Setează (sau revocă) accesul unui utilizator la o anumită ediție. Folosit de
// admin pentru a bifa cine participă la fiecare competiție/an.
export async function setUserEditionAccess(
  userId: string,
  editionId: string,
  allowed: boolean,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    [`access.${editionId}`]: allowed,
  })
}

// Resetare parolă de către admin: setează noua parolă și forțează utilizatorul
// să o schimbe la următoarea autentificare.
export async function updateUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    password,
    mustChangePassword: true,
  })
}

// Schimbarea parolei de către utilizatorul însuși: verifică parola curentă și,
// dacă e corectă, o înlocuiește și dezactivează forțarea schimbării.
export async function changeOwnPassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: boolean; error?: string }> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) {
    return { ok: false, error: 'Cont inexistent.' }
  }
  const data = snap.data() as Omit<AppUser, 'id'>
  if (data.password !== currentPassword) {
    return { ok: false, error: 'Parola curentă este incorectă.' }
  }
  if (newPassword.length < 4) {
    return { ok: false, error: 'Noua parolă trebuie să aibă minim 4 caractere.' }
  }
  if (newPassword === currentPassword) {
    return { ok: false, error: 'Noua parolă trebuie să fie diferită de cea curentă.' }
  }
  await updateDoc(doc(db, 'users', userId), {
    password: newPassword,
    mustChangePassword: false,
  })
  return { ok: true }
}

// Seed the fixed participant list + admin account if the collection is empty.
// Default password for every participant is "cm2026". Admin password: "admin".
export async function seedUsersIfEmpty(): Promise<boolean> {
  const existing = await getUsers()
  if (existing.length > 0) return false

  await createUser('Administrator', 'admin', 'admin', true)
  for (const fullName of PARTICIPANTS) {
    await createUser(fullName, slugifyUsername(fullName), DEFAULT_PASSWORD, false)
  }
  return true
}

export async function updateMatchResult(
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
): Promise<void> {
  // Când adminul introduce/corectează un scor, îl marcăm ca override manual ca
  // sincronizarea automată să nu îl mai suprascrie. La ștergerea scorului
  // (null) eliberăm flag-ul, lăsând sincronizarea să preia din nou.
  const scoreOverride = homeScore !== null && awayScore !== null
  await updateDoc(doc(db, 'matches', matchId), {
    homeScore,
    awayScore,
    scoreOverride,
  })
}

export async function updateMatch(matchId: string, data: Partial<Match>): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), data)
}

export interface StandingRow {
  userId: string
  username: string
  name: string
  points: number
  exact: number
  correct1x2: number
  played: number // matches with official result AND a prediction
  predicted: number // total predictions on finished matches
  // shared 1-based position (ties get the same rank)
  rank: number
}

// Compute a standings table. If stage is provided, only matches in that stage.
//
// `viewer` controlează vizibilitatea jucătorilor ascunși (hideFromStandings):
// un astfel de jucător apare DOAR pentru el însuși și pentru admini. Pentru
// ceilalți este complet eliminat, iar pozițiile se recalculează curat.
// Conturile de supraveghere (viewOnly) și adminul dedicat nu apar niciodată.
export function computeStandings(
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
  stage?: StageId,
  viewer?: { id?: string; isAdmin?: boolean },
): StandingRow[] {
  const relevant = matches.filter(
    (m) =>
      m.homeScore !== null &&
      m.awayScore !== null &&
      (stage === undefined || m.stage === stage),
  )
  const predByKey = new Map(predictions.map((p) => [`${p.userId}_${p.matchId}`, p]))

  // Note: we intentionally do NOT exclude admins here. In this league the
  // administrator (e.g. Simon) is also a participant, so excluding admins would
  // drop a real player from the standings. We only hide a dedicated, non-playing
  // admin account (username "admin" / name "Administrator").
  const isDedicatedAdmin = (u: AppUser) =>
    u.username === 'admin' || (u.name ?? '').toLowerCase() === 'administrator'

  // Un jucător ascuns e vizibil doar pentru sine și pentru admini.
  const canSeeHidden = (u: AppUser) =>
    viewer?.isAdmin === true || viewer?.id === u.id

  const rows: Omit<StandingRow, 'rank'>[] = users
    .filter((u) => !isDedicatedAdmin(u) && !isViewOnly(u))
    .filter((u) => !u.hideFromStandings || canSeeHidden(u))
    .map((u) => {
      let points = 0
      let exact = 0
      let correct = 0
      let predicted = 0
      for (const m of relevant) {
        const pred = predByKey.get(`${u.id}_${m.id}`)
        if (!pred) continue
        predicted += 1
        const s = scorePrediction(pred, m)
        points += s
        if (s === 3) exact += 1
        else if (s === 1) correct += 1
      }
      return {
        userId: u.id,
        username: u.username,
        name: u.name || u.username,
        points,
        exact,
        correct1x2: correct,
        played: predicted,
        predicted,
      }
    })

  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.exact - a.exact ||
      b.correct1x2 - a.correct1x2 ||
      a.name.localeCompare(b.name),
  )

  // Assign shared positions: rows tied on points share the same rank.
  let lastPoints: number | null = null
  let lastRank = 0
  return rows.map((row, i) => {
    let rank: number
    if (lastPoints !== null && row.points === lastPoints) {
      rank = lastRank // share position with previous tied row
    } else {
      rank = i + 1
      lastRank = rank
      lastPoints = row.points
    }
    return { ...row, rank }
  })
}

// Un punct pe graficul de evoluție: poziția fiecărui jucător după meciul `idx`.
export interface PositionHistoryPoint {
  idx: number // numărul meciului încheiat (1-based), în ordine cronologică
  label: string // etichetă scurtă pentru axă (ex. „M1")
  ranks: Record<string, number> // userId -> poziție după acest meci
}

export interface PositionHistory {
  points: PositionHistoryPoint[]
  players: { userId: string; name: string }[]
}

// Calculează evoluția pozițiilor: pentru fiecare meci încheiat (în ordine
// cronologică), recalculează clasamentul cumulativ și reține poziția fiecărui
// jucător. Permite desenarea unui grafic „poziție după fiecare meci".
// Dacă `stage` e dat, se iau în calcul doar meciurile acelei etape, iar
// pozițiile reflectă clasamentul etapei respective.
export function computePositionHistory(
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
  stage?: StageId,
  viewer?: { id?: string; isAdmin?: boolean },
): PositionHistory {
  const scoped = stage ? matches.filter((m) => m.stage === stage) : matches
  const finished = scoped
    .filter((m) => m.homeScore !== null && m.awayScore !== null)
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))

  // Setul de jucători (și ordinea) din clasamentul final al scopului — respectă
  // filtrele de vizibilitate (ascunși/supraveghere).
  const finalRows = computeStandings(users, matches, predictions, stage, viewer)
  const players = finalRows.map((r) => ({ userId: r.userId, name: r.name }))

  const points: PositionHistoryPoint[] = []
  for (let i = 0; i < finished.length; i++) {
    const prefix = finished.slice(0, i + 1)
    const rows = computeStandings(users, prefix, predictions, stage, viewer)
    const ranks: Record<string, number> = {}
    for (const r of rows) ranks[r.userId] = r.rank
    points.push({ idx: i + 1, label: `M${i + 1}`, ranks })
  }

  return { points, players }
}
