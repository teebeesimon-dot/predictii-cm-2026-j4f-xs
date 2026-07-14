import { type NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { notificationEngine } from '@/lib/notifications/engine/NotificationEngine'

/**
 * Endpoint de debug pentru Notification Engine.
 *
 * DOAR administratorii au acces (verificat din Firestore) sau cron (CRON_SECRET).
 * NU trimite notificări — execută engine-ul și întoarce decizia ca JSON.
 *
 * Body (JSON): { "actorId": "..." }
 * Răspuns: { success, executionTime, rulesExecuted, notificationsGenerated,
 *            duplicatesRemoved, invalidRemoved, notifications, errors, ranAt }
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { actorId?: string }

  let auth
  try {
    auth = await authorizeAdminRequest(req, body.actorId)
  } catch (e) {
    // Ex.: FIREBASE_SERVICE_ACCOUNT nesetat → nu putem verifica rolul.
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason ?? 'Neautorizat' },
      { status: 401 },
    )
  }

  try {
    console.log(`[v0] notif-engine: rulare cerută de ${auth.actorName}`)
    const result = await notificationEngine.run()
    return NextResponse.json(result)
  } catch (e) {
    console.log('[v0] notif-engine: eroare la rulare:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
