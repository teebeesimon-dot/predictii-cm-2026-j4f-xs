import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  orderBy,
  query,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AppUser, Match, Prediction, StageId } from '@/lib/types'
import { scorePrediction } from '@/lib/types'

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
  points: number
  exact: number
  correct1x2: number
  played: number // matches with official result AND a prediction
  predicted: number // total predictions on finished matches
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

  const rows: StandingRow[] = users
    .filter((u) => !u.isAdmin)
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
      a.username.localeCompare(b.username),
  )
  return rows
}
