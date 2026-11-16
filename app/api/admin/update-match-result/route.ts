import { NextRequest, NextResponse } from 'next/server'
import { adminDeniedResponse, authorizeAdminRequest } from '@/lib/admin-auth'
import { adminDb } from '@/lib/firebase-admin'
import { rebuildAffectedLeaderboardSummaries, rebuildEditionLeaderboardSummaries } from '@/lib/server/leaderboard-aggregates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    matchId?: string
    homeScore?: number | null
    awayScore?: number | null
  }
  const matchId = body.matchId?.trim()
  const homeScore = body.homeScore
  const awayScore = body.awayScore

  const validScore = (value: unknown) =>
    value === null || (Number.isInteger(value) && (value as number) >= 0)
  if (!matchId || !validScore(homeScore) || !validScore(awayScore) ||
      ((homeScore === null) !== (awayScore === null))) {
    return NextResponse.json({ error: 'Datele rezultatului sunt invalide.' }, { status: 400 })
  }

  const auth = await authorizeAdminRequest(req)
  if (!auth.ok) return adminDeniedResponse(auth)

  try {
    const matchRef = adminDb().collection('matches').doc(matchId)
    const snap = await matchRef.get()
    if (!snap.exists) {
      return NextResponse.json({ error: 'Meciul nu exista.' }, { status: 404 })
    }
    await matchRef.update({
      homeScore,
      awayScore,
      scoreOverride: homeScore !== null && awayScore !== null,
    })
    const editionId = String(snap.data()?.editionId ?? 'wc-2026')
    let summariesUpdated = 0
    let summaryRefreshMode: 'match' | 'edition' | 'failed' = 'match'
    try {
      const rebuilt = await rebuildAffectedLeaderboardSummaries([{ matchId, editionId }])
      summariesUpdated = rebuilt.summariesWritten
    } catch (error) {
      console.error('[admin/update-match-result] match summary rebuild failed', error)
      try {
        const rebuilt = await rebuildEditionLeaderboardSummaries(editionId)
        summariesUpdated = rebuilt.summariesWritten
        summaryRefreshMode = 'edition'
      } catch (fallbackError) {
        summaryRefreshMode = 'failed'
        console.error('[admin/update-match-result] edition summary rebuild failed', fallbackError)
      }
    }
    return NextResponse.json({ ok: true, matchId, editionId, summariesUpdated, summaryRefreshMode })
  } catch (error) {
    console.error('[admin/update-match-result] failed', error)
    return NextResponse.json({ error: 'Nu am putut actualiza rezultatul.' }, { status: 500 })
  }
}
