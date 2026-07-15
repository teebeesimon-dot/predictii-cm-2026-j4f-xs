import 'server-only'
import { adminDb } from '@/lib/firebase-admin'
import { DEFAULT_EDITION_ID, type Match, type AppUser, type Prediction } from '@/lib/types'
import { getEdition } from '@/lib/editions'
import { stagesForEdition } from '@/lib/stages'
import { buildScheduler } from '@/lib/schedule'
import { DEADLINE_OFFSETS, stageDeadlineMs } from '@/lib/notifications/rules/_shared'
import type { EngineData, EditionSnapshot } from '@/lib/notifications/context/EngineData'

// Ediția unui document (meci/pronostic): documentele mai vechi nu au câmpul
// editionId și aparțin ediției existente World Cup 2026. (Identic cu logica din
// lib/data.ts, dar aici citim prin Admin SDK, nu prin SDK-ul client.)
function editionOf(doc: { editionId?: string }): string {
  return doc.editionId ?? DEFAULT_EDITION_ID
}

// Ferestre în care regulile de „deschidere"/„închidere" a etapei se pot
// declanșa (trebuie să corespundă grace-urilor din reguli).
const OPEN_GRACE_MS = 6 * 3600_000 // stage-opened-rule
const CLOSE_GRACE_MS = 6 * 3600_000 // stage-closed-rule

// Programul meciurilor se schimbă rar, dar cron-ul rulează la 5 minute.
// Cache-ul per instanță elimină scanările repetate ale colecției matches fără
// risc de a rata ferestrele (TTL-ul este mult sub grace-ul minim de 12 minute).
const MATCH_CACHE_MS = 10 * 60_000
let matchCache: { loadedAt: number; matches: Match[] } | null = null

async function loadMatches(): Promise<Match[]> {
  if (matchCache && Date.now() - matchCache.loadedAt < MATCH_CACHE_MS) {
    return matchCache.matches
  }
  const snap = await adminDb().collection('matches').get()
  const matches = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<Match, 'id'>),
  }))
  matchCache = { loadedAt: Date.now(), matches }
  return matches
}

/**
 * Verifică IEFTIN (doar din meciuri/scheduler, fără a citi userii sau
 * pronosticurile) dacă momentul `now` cade în vreo fereastră în care o regulă
 * ar putea produce notificări.
 *
 *  - needUsers: e activă vreo fereastră de deadline / deschidere / închidere de
 *    etapă (toate regulile au nevoie de lista participanților).
 *  - needPredictions: e activă vreo fereastră de deadline (doar acolo avem
 *    nevoie de pronosticuri, ca să știm cine nu a completat).
 *
 * Dacă nimic nu e activ, engine-ul NU citește `users`/`predictions` — ceea ce
 * elimină citirile masive la fiecare rulare de cron. Rezultatul rămâne identic:
 * în afara ferestrelor, toate regulile întorc oricum zero notificări.
 */
function windowNeeds(
  now: number,
  editions: EditionSnapshot[],
): {
  needUsers: boolean
  needPredictions: boolean
  predictionEditionIds: Set<string>
} {
  let needUsers = false
  let needPredictions = false
  const predictionEditionIds = new Set<string>()

  for (const edition of editions) {
    const stages = edition.stages
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i]
      const deadline = stageDeadlineMs(edition.scheduler, stage.id)
      if (deadline === null) continue

      // Ferestre de reamintire a termenului (au nevoie de pronosticuri).
      for (const { ms, grace } of Object.values(DEADLINE_OFFSETS)) {
        const marker = deadline - ms
        if (now >= marker && now < marker + grace && now < deadline) {
          needUsers = true
          needPredictions = true
          predictionEditionIds.add(edition.editionId)
        }
      }

      // Fereastră de închidere a etapei (doar useri).
      if (now >= deadline && now < deadline + CLOSE_GRACE_MS) {
        needUsers = true
      }

      // Fereastră de deschidere a etapei următoare = la termenul acestei etape.
      if (i + 1 < stages.length) {
        if (now >= deadline && now < deadline + OPEN_GRACE_MS) {
          needUsers = true
        }
      }

    }
  }

  return { needUsers, needPredictions, predictionEditionIds }
}

/**
 * Încarcă datele necesare regulilor prin Admin SDK, MINIMIZÂND citirile.
 *
 * Întotdeauna citește `matches` (necesare pentru scheduler și pentru a decide
 * dacă e activă vreo fereastră). Citește `users` și `predictions` DOAR când o
 * fereastră relevantă e activă (vezi windowNeeds). Astfel, la rulările de cron
 * din afara ferestrelor (marea majoritate) se face O SINGURĂ citire de
 * colecție în loc de trei.
 */
export async function loadEngineData(now: number = Date.now()): Promise<EngineData> {
  const db = adminDb()

  // 1) Programul meciurilor, reutilizat între rulările apropiate de cron.
  const matches = await loadMatches()

  // Grupează meciurile pe ediție și construiește scheduler-ul fiecărei ediții.
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

  // 2) Gate ieftin: citim userii/pronosticurile doar dacă e activă o fereastră.
  // Optimizarea ferestrelor rămâne intactă — reducătoarele de citiri Firestore.
  // Plugin-ul de achievements se bazează pe `_predictions`; dacă nu e activă
  // nicio fereastră, `_predictions` va fi [] și pluginul returnează 0 drafts.
  const { needUsers, needPredictions, predictionEditionIds } = windowNeeds(
    now,
    editions,
  )

  let users: AppUser[] = []
  const predictionSet = new Set<string>()
  const predictionsArr: Prediction[] = []

  if (needUsers || needPredictions) {
    const predictionQueries = needPredictions
      ? Array.from(predictionEditionIds).map((editionId) =>
          editionId === DEFAULT_EDITION_ID
            ? db.collection('predictions')
            : db.collection('predictions').where('editionId', '==', editionId),
        )
      : []
    const [usersSnap, predictionSnaps] = await Promise.all([
      needUsers ? db.collection('users').get() : Promise.resolve(null),
      Promise.all(predictionQueries.map((q) => q.get())),
    ])
    if (usersSnap) {
      users = usersSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<AppUser, 'id'>),
      }))
    }
    for (const snap of predictionSnaps) {
      for (const d of snap.docs) {
        const p = { id: d.id, ...(d.data() as Omit<Prediction, 'id'>) }
        predictionSet.add(`${p.userId}_${p.matchId}`)
        predictionsArr.push(p)
      }
    }
  }

  return {
    now,
    users,
    editions,
    _predictions: predictionsArr,
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
