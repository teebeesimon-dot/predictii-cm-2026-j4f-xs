import { type NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { getRunLog } from '@/lib/notifications/history/EngineRunLog'
import { getRecentNotifications } from '@/lib/notifications/history/NotificationHistory'
import { readSyncStatus } from '@/app/actions/sync'

// Agregă datele pentru panoul de administrare „Prezentare generală":
// - jurnalul execuțiilor Notification Engine (inclusiv eșecuri);
// - starea sincronizării automate (AutoSync) + ultima sincronizare;
// - istoricul recent al notificărilor trimise.
// Toate sunt citiri ieftine (documente unice / interogări limitate).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { actorId?: string }

  let auth
  try {
    auth = await authorizeAdminRequest(req, body.actorId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason ?? 'Neautorizat' },
      { status: 401 },
    )
  }

  const [runLog, recentNotifications, syncStatus] = await Promise.all([
    getRunLog(),
    getRecentNotifications(30),
    readSyncStatus().catch(() => null),
  ])

  return NextResponse.json({
    runLog,
    recentNotifications,
    syncStatus,
  })
}
