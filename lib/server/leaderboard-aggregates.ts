import 'server-only'
import { adminDb } from '@/lib/firebase-admin'

type ScoreDoc = {
  userId?: string
  matchId?: string
  editionId?: string
  homeScore?: number
  awayScore?: number
}
type MatchDoc = {
  editionId?: string
  stage?: number
  homeScore?: number | null
  awayScore?: number | null
}
const DEFAULT_EDITION = 'wc-2026'

function outcome(home: number, away: number): 'H' | 'D' | 'A' {
  return home > away ? 'H' : home < away ? 'A' : 'D'
}
function points(pred: ScoreDoc, match: MatchDoc): number {
  if (match.homeScore == null || match.awayScore == null) return 0
  if (pred.homeScore === match.homeScore && pred.awayScore === match.awayScore) return 3
  return outcome(pred.homeScore ?? -1, pred.awayScore ?? -1) === outcome(match.homeScore, match.awayScore) ? 1 : 0
}

/** Rebuild one participant's totals from source-of-truth predictions and matches. */
export async function rebuildUserLeaderboardSummary(userId: string, editionId: string) {
  const db = adminDb()
  const [predSnap, matchSnap] = await Promise.all([
    db.collection('predictions').where('userId', '==', userId).get(),
    editionId === DEFAULT_EDITION
      ? db.collection('matches').get()
      : db.collection('matches').where('editionId', '==', editionId).get(),
  ])
  const matches = new Map<string, MatchDoc>()
  for (const d of matchSnap.docs) {
    const m = d.data() as MatchDoc
    if ((m.editionId ?? DEFAULT_EDITION) === editionId) matches.set(d.id, m)
  }
  const totals = { points: 0, exact: 0, correct1x2: 0, played: 0 }
  const stages: Record<string, { points: number; exact: number; correct1x2: number; played: number }> = {}
  for (const d of predSnap.docs) {
    const p = d.data() as ScoreDoc
    if ((p.editionId ?? DEFAULT_EDITION) !== editionId || !p.matchId) continue
    const match = matches.get(p.matchId)
    if (!match || match.homeScore == null || match.awayScore == null) continue
    const score = points(p, match)
    totals.points += score
    totals.played += 1
    if (score === 3) totals.exact += 1
    else if (score === 1) totals.correct1x2 += 1
    const stageKey = String(match.stage ?? 0)
    const stage = stages[stageKey] ??= { points: 0, exact: 0, correct1x2: 0, played: 0 }
    stage.points += score
    stage.played += 1
    if (score === 3) stage.exact += 1
    else if (score === 1) stage.correct1x2 += 1
  }
  const ref = db.collection('leaderboard_summaries').doc(`${editionId}_${userId}`)
  await ref.set({ userId, editionId, ...totals, stages, rebuiltAt: Date.now(), source: 'server-rebuild' })
  return { userId, editionId, ...totals }
}

/** Rebuild all participants affected by a changed match result. */
export async function rebuildMatchLeaderboardSummaries(matchId: string, editionId: string) {
  const snap = await adminDb().collection('predictions').where('matchId', '==', matchId).get()
  const ids = [...new Set(snap.docs.map((d) => String(d.data().userId ?? '')).filter(Boolean))]
  const results = await Promise.all(ids.map((id) => rebuildUserLeaderboardSummary(id, editionId)))
  return results.length
}


/**
 * Rebuild only participants affected by one or more changed match results.
 * Predictions are read once per changed match to identify participants, then
 * once per affected participant to calculate the full edition totals.
 */
export async function rebuildAffectedLeaderboardSummaries(
  changes: Array<{ matchId: string; editionId: string }>,
) {
  const db = adminDb()
  const editionByMatch = new Map(changes.map((change) => [change.matchId, change.editionId]))
  const affectedByEdition = new Map<string, Set<string>>()
  const predictionSnaps = await Promise.all(
    changes.map((change) =>
      db.collection('predictions').where('matchId', '==', change.matchId).get(),
    ),
  )

  for (let i = 0; i < changes.length; i++) {
    const editionId = changes[i].editionId
    const ids = affectedByEdition.get(editionId) ?? new Set<string>()
    for (const predictionDoc of predictionSnaps[i].docs) {
      const prediction = predictionDoc.data() as ScoreDoc
      if (!prediction.userId) continue
      if ((prediction.editionId ?? DEFAULT_EDITION) !== editionId) continue
      ids.add(prediction.userId)
    }
    affectedByEdition.set(editionId, ids)
  }

  let summariesWritten = 0
  for (const [editionId, userIds] of affectedByEdition) {
    if (userIds.size === 0) continue
    const matchSnap = editionId === DEFAULT_EDITION
      ? await db.collection('matches').get()
      : await db.collection('matches').where('editionId', '==', editionId).get()
    const matches = new Map<string, MatchDoc>()
    for (const matchDoc of matchSnap.docs) {
      const match = matchDoc.data() as MatchDoc
      if ((match.editionId ?? DEFAULT_EDITION) === editionId) matches.set(matchDoc.id, match)
    }

    const userPredictions = await Promise.all(
      [...userIds].map((userId) =>
        db.collection('predictions').where('userId', '==', userId).get(),
      ),
    )
    let batch = db.batch()
    let operations = 0
    for (let i = 0; i < userPredictions.length; i++) {
      const userId = [...userIds][i]
      const totals = { points: 0, exact: 0, correct1x2: 0, played: 0 }
      const stages: Record<string, { points: number; exact: number; correct1x2: number; played: number }> = {}
      for (const predictionDoc of userPredictions[i].docs) {
        const prediction = predictionDoc.data() as ScoreDoc
        if ((prediction.editionId ?? DEFAULT_EDITION) !== editionId || !prediction.matchId) continue
        const match = matches.get(prediction.matchId)
        if (!match || match.homeScore == null || match.awayScore == null) continue
        const score = points(prediction, match)
        totals.points += score
        totals.played++
        if (score === 3) totals.exact++
        else if (score === 1) totals.correct1x2++
        const stageKey = String(match.stage ?? 0)
        const stage = stages[stageKey] ??= { points: 0, exact: 0, correct1x2: 0, played: 0 }
        stage.points += score
        stage.played++
        if (score === 3) stage.exact++
        else if (score === 1) stage.correct1x2++
      }
      batch.set(db.collection('leaderboard_summaries').doc(`${editionId}_${userId}`), {
        userId, editionId, ...totals, stages, rebuiltAt: Date.now(), source: 'match-result-update',
      })
      operations++
      summariesWritten++
      if (operations === 450) {
        await batch.commit()
        batch = db.batch()
        operations = 0
      }
    }
    if (operations) await batch.commit()
  }

  return { summariesWritten, participants: [...affectedByEdition.values()].reduce((sum, ids) => sum + ids.size, 0) }
}

/** One-time full rebuild. Reads source collections once and writes one summary per user. */
export async function rebuildEditionLeaderboardSummaries(editionId: string) {
  const db = adminDb()
  const [usersSnap, predictionsSnap, matchesSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('predictions').get(),
    editionId === DEFAULT_EDITION
      ? db.collection('matches').get()
      : db.collection('matches').where('editionId', '==', editionId).get(),
  ])
  const matches = new Map<string, MatchDoc>()
  for (const d of matchesSnap.docs) {
    const m = d.data() as MatchDoc
    if ((m.editionId ?? DEFAULT_EDITION) === editionId) matches.set(d.id, m)
  }
  const byUser = new Map<string, ScoreDoc[]>()
  for (const d of predictionsSnap.docs) {
    const p = d.data() as ScoreDoc
    if ((p.editionId ?? DEFAULT_EDITION) !== editionId || !p.userId) continue
    const list = byUser.get(p.userId) ?? []
    list.push(p)
    byUser.set(p.userId, list)
  }
  let batch = db.batch()
  let operations = 0
  let written = 0
  const results: Array<{ userId: string; points: number; exact: number; correct1x2: number; played: number }> = []
  for (const userDoc of usersSnap.docs) {
    const userId = userDoc.id
    const user = userDoc.data()
    if (user.viewOnly === true || user.username === 'admin' || String(user.name ?? '').toLowerCase() === 'administrator') continue
    const totals = { points: 0, exact: 0, correct1x2: 0, played: 0 }
    const stages: Record<string, { points: number; exact: number; correct1x2: number; played: number }> = {}
    for (const p of byUser.get(userId) ?? []) {
      if (!p.matchId) continue
      const match = matches.get(p.matchId)
      if (!match || match.homeScore == null || match.awayScore == null) continue
      const score = points(p, match)
      totals.points += score
      totals.played++
      if (score === 3) totals.exact++
      else if (score === 1) totals.correct1x2++
      const key = String(match.stage ?? 0)
      const stage = stages[key] ??= { points: 0, exact: 0, correct1x2: 0, played: 0 }
      stage.points += score
      stage.played++
      if (score === 3) stage.exact++
      else if (score === 1) stage.correct1x2++
    }
    const ref = db.collection('leaderboard_summaries').doc(`${editionId}_${userId}`)
    batch.set(ref, { userId, editionId, ...totals, stages, rebuiltAt: Date.now(), source: 'full-backfill' })
    operations++
    written++
    results.push({ userId, ...totals })
    if (operations === 450) {
      await batch.commit()
      batch = db.batch()
      operations = 0
    }
  }
  if (operations) await batch.commit()
  return { editionId, usersRead: usersSnap.size, predictionsRead: predictionsSnap.size, matchesRead: matchesSnap.size, summariesWritten: written, results }
}
