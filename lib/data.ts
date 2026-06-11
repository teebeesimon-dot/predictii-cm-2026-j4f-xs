import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AppUser, Match, Prediction, StageId } from '@/lib/types'
import { scorePrediction, PARTICIPANTS } from '@/lib/types'

export async function getMatches(): Promise<Match[]> {
  const q = query(collection(db, 'matches'), orderBy('kickoff', 'asc'))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
}

export async function getUsers(): Promise<AppUser[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AppUser, 'id'>) }))
}

export async function getAllPredictions(): Promise<Prediction[]> {
  const snap = await getDocs(collection(db, 'predictions'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Prediction, 'id'>) }))
}

export async function getUserPredictions(userId: string): Promise<Prediction[]> {
  const all = await getAllPredictions()
  return all.filter((p) => p.userId === userId)
}

export async function savePrediction(
  userId: string,
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<void> {
  const id = `${userId}_${matchId}`
  await setDoc(doc(db, 'predictions', id), {
    userId,
    matchId,
    homeScore,
    awayScore,
    updatedAt: Date.now(),
  })
}

export async function createMatch(data: Omit<Match, 'id'>): Promise<void> {
  const id = doc(collection(db, 'matches')).id
  await setDoc(doc(db, 'matches', id), data)
}

// ---- User management (admin only) ----

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
  })
}

export async function deleteUser(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId))
}

export async function updateUserPassword(
  userId: string,
  password: string,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { password })
}

// Seed the fixed participant list + admin account if the collection is empty.
// Default password for every participant is "cm2026". Admin password: "admin".
export async function seedUsersIfEmpty(): Promise<boolean> {
  const existing = await getUsers()
  if (existing.length > 0) return false

  await createUser('Administrator', 'admin', 'admin', true)
  for (const fullName of PARTICIPANTS) {
    await createUser(fullName, slugifyUsername(fullName), 'cm2026', false)
  }
  return true
}

export async function updateMatchResult(
  matchId: string,
  homeScore: number | null,
  awayScore: number | null,
): Promise<void> {
  await updateDoc(doc(db, 'matches', matchId), { homeScore, awayScore })
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
export function computeStandings(
  users: AppUser[],
  matches: Match[],
  predictions: Prediction[],
  stage?: StageId,
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

  const rows: Omit<StandingRow, 'rank'>[] = users
    .filter((u) => !isDedicatedAdmin(u))
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
