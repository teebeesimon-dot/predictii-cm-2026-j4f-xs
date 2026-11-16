import { NextRequest, NextResponse } from 'next/server'
import { adminDeniedResponse, authorizeAdminRequest } from '@/lib/admin-auth'
import { rebuildEditionLeaderboardSummaries } from '@/lib/server/leaderboard-aggregates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.ok) return adminDeniedResponse(auth)
  const body = (await req.json().catch(() => ({}))) as { editionId?: string }
  const editionId = body.editionId?.trim()
  if (!editionId || editionId.length > 100) {
    return NextResponse.json({ error: 'editionId invalid.' }, { status: 400 })
  }
  try {
    const result = await rebuildEditionLeaderboardSummaries(editionId)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('[admin/rebuild-leaderboards] failed', error)
    return NextResponse.json({ error: 'Nu am putut recalcula sumarul clasamentului.' }, { status: 500 })
  }
}
