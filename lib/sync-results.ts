// Logica de sincronizare a rezultatelor: preia scorurile de la football-data.org
// și actualizează DOAR câmpurile homeScore/awayScore în Firestore pentru
// meciurile la care scorul s-a schimbat.
//
// De ce e suficient: clasamentele, statisticile și premiile sunt calculate
// „live" din scorurile meciurilor (computeStandings / scorePrediction sunt
// funcții pure). Deci în clipa în care scorul unui meci se schimbă în Firestore,
// toate aceste pagini se recalculează automat la următorul refresh de date.

import {
  collection,
  getDocs,
  doc,
  writeBatch,
  setDoc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Match } from '@/lib/types'
import {
  fetchWorldCupMatches,
  diffScores,
  type ScoreUpdate,
} from '@/lib/football-data'

const SYNC_META_DOC = 'sync'
const META_COLLECTION = 'meta'

export interface SyncResult {
  ok: boolean
  checked: number
  updated: number
  changes: ScoreUpdate[]
  unmatched: number
  message: string
  ranAt: number
}

export interface SyncStatus {
  lastRunAt: number | null
  lastUpdatedCount: number | null
  lastCheckedCount: number | null
  lastMessage: string | null
  lastError: string | null
}

// Citește toate meciurile din Firestore.
async function getFirestoreMatches(): Promise<Match[]> {
  const snap = await getDocs(collection(db, 'matches'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Match, 'id'>) }))
}

// Salvează starea ultimei sincronizări (pentru afișare în admin).
async function writeSyncStatus(status: Partial<SyncStatus> & { lastRunAt: number }) {
  await setDoc(
    doc(db, META_COLLECTION, SYNC_META_DOC),
    { ...status, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

// Citește starea ultimei sincronizări.
export async function getSyncStatus(): Promise<SyncStatus> {
  const snap = await getDoc(doc(db, META_COLLECTION, SYNC_META_DOC))
  if (!snap.exists()) {
    return {
      lastRunAt: null,
      lastUpdatedCount: null,
      lastCheckedCount: null,
      lastMessage: null,
      lastError: null,
    }
  }
  const d = snap.data()
  return {
    lastRunAt: typeof d.lastRunAt === 'number' ? d.lastRunAt : null,
    lastUpdatedCount: typeof d.lastUpdatedCount === 'number' ? d.lastUpdatedCount : null,
    lastCheckedCount: typeof d.lastCheckedCount === 'number' ? d.lastCheckedCount : null,
    lastMessage: typeof d.lastMessage === 'string' ? d.lastMessage : null,
    lastError: typeof d.lastError === 'string' ? d.lastError : null,
  }
}

// Rulează o sincronizare completă: preia scorurile, calculează diferențele și
// scrie în Firestore doar ce s-a schimbat. `includeLive` controlează dacă
// actualizăm și scorurile meciurilor în desfășurare (pe lângă cele finalizate).
export async function runResultsSync(
  options: { includeLive?: boolean } = {},
): Promise<SyncResult> {
  const ranAt = Date.now()
  const token = process.env.FOOTBALL_DATA_API_TOKEN

  if (!token) {
    const message = 'Lipsește FOOTBALL_DATA_API_TOKEN.'
    await writeSyncStatus({ lastRunAt: ranAt, lastError: message }).catch(() => {})
    return { ok: false, checked: 0, updated: 0, changes: [], unmatched: 0, message, ranAt }
  }

  try {
    const [firestoreMatches, apiMatches] = await Promise.all([
      getFirestoreMatches(),
      fetchWorldCupMatches(token),
    ])

    const unmatched = apiMatches.filter((a) => !a.roHome || !a.roAway).length
    const changes = diffScores(firestoreMatches, apiMatches, {
      includeLive: options.includeLive,
    })

    if (changes.length > 0) {
      // Firestore acceptă maxim 500 operații per batch; avem cel mult 72 meciuri.
      const batch = writeBatch(db)
      for (const c of changes) {
        batch.update(doc(db, 'matches', c.matchId), {
          homeScore: c.toHome,
          awayScore: c.toAway,
        })
      }
      await batch.commit()
    }

    const message =
      changes.length > 0
        ? `Actualizat ${changes.length} meci(uri).`
        : 'Niciun scor nou.'

    await writeSyncStatus({
      lastRunAt: ranAt,
      lastUpdatedCount: changes.length,
      lastCheckedCount: firestoreMatches.length,
      lastMessage: message,
      lastError: null,
    }).catch(() => {})

    return {
      ok: true,
      checked: firestoreMatches.length,
      updated: changes.length,
      changes,
      unmatched,
      message,
      ranAt,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Eroare necunoscută la sincronizare.'
    await writeSyncStatus({ lastRunAt: ranAt, lastError: message }).catch(() => {})
    return { ok: false, checked: 0, updated: 0, changes: [], unmatched: 0, message, ranAt }
  }
}
