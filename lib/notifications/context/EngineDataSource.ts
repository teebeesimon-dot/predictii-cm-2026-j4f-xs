import 'server-only'
import { adminDb } from '@/lib/firebase-admin'
import { DEFAULT_EDITION_ID, type Match, type AppUser, type Prediction } from '@/lib/types'
import { getEdition } from '@/lib/editions'
import { stagesForEdition } from '@/lib/stages'
import { buildScheduler } from '@/lib/schedule'
import type { EngineData, EditionSnapshot } from '@/lib/notifications/context/EngineData'

// Ediția unui document (meci/pronostic): documentele mai vechi nu au câmpul
// editionId și aparțin ediției existente World Cup 2026. (Identic cu logica din
// lib/data.ts, dar aici citim prin Admin SDK, nu prin SDK-ul client.)
function editionOf(doc: { editionId?: string }): string {
  return doc.editionId ?? DEFAULT_EDITION_ID
}

/**
 * Încarcă TOATE datele necesare regulilor, o singură dată, prin Admin SDK.
 *
 * Trei citiri de colecție (matches, users, predictions) — indiferent câte
 * reguli sau ediții există. Construiește câte un `scheduler` per ediție ca
 * regulile să folosească exact programul și termenele deja existente.
 */
export async function loadEngineData(now: number = Date.now()): Promise<EngineData> {
  const db = adminDb()
  const [matchesSnap, usersSnap, predsSnap] = await Promise.all([
    db.collection('matches').get(),
    db.collection('users').get(),
    db.collection('predictions').get(),
  ])

  const matches: Match[] = matchesSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Match, 'id'>),
  }))
  const users: AppUser[] = usersSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<AppUser, 'id'>),
  }))
  const predictions: Prediction[] = predsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Prediction, 'id'>),
  }))

  // Index rapid: „userId_matchId" -> există pronostic.
  const predictionSet = new Set<string>()
  for (const p of predictions) predictionSet.add(`${p.userId}_${p.matchId}`)

  // Grupează meciurile pe ediție.
  const matchesByEdition = new Map<string, Match[]>()
  for (const m of matches) {
    const eid = editionOf(m)
    const list = matchesByEdition.get(eid)
    if (list) list.push(m)
    else matchesByEdition.set(eid, [m])
  }

  const editions: EditionSnapshot[] = []
  for (const [editionId, editionMatches] of matchesByEdition) {
    const edition = getEdition(editionId)
    editions.push({
      editionId,
      competitionId: edition?.competitionId ?? 'wc',
      label: edition?.label ?? editionId,
      matches: editionMatches,
      stages: stagesForEdition(editionId),
      scheduler: buildScheduler(editionId, editionMatches),
    })
  }

  return {
    now,
    users,
    editions,
    hasPrediction: (userId, matchId) =>
      predictionSet.has(`${userId}_${matchId}`),
    matchesForStage: (editionId, stage) =>
      (matchesByEdition.get(editionId) ?? []).filter((m) => m.stage === stage),
  }
}

// Fallback gol, folosit când datele nu pot fi încărcate (ex.
// FIREBASE_SERVICE_ACCOUNT lipsă). Regulile primesc context valid, dar nu
// produc nimic — engine-ul nu crapă.
export function emptyEngineData(now: number = Date.now()): EngineData {
  return {
    now,
    users: [],
    editions: [],
    hasPrediction: () => false,
    matchesForStage: () => [],
  }
}
