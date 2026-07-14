import { type NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { notificationEngine } from '@/lib/notifications/engine/NotificationEngine'

/**
 * Endpoint de debug pentru Notification Engine.
 *
 * DOAR administratorii au acces (verificat din Firestore) sau cron (CRON_SECRET).
 * NU trimite notificări — execută engine-ul și întoarce decizia ca JSON.
 *
 * Body (JSON): { "actorId": "...", "mode": "dry-run" | "live" }
 *   - 'dry-run' (implicit): DOAR generează notificările, fără efecte secundare.
 *   - 'live':   trimite notificările și le salvează în notification_history.
 * Răspuns: EngineRunResult (JSON).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    actorId?: string
    mode?: string
  }
  // Orice altă valoare decât 'live' este tratată drept 'dry-run' (implicit sigur).
  const mode = body.mode === 'live' ? 'live' : 'dry-run'

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
    console.log(
      `[v0] notif-engine: rulare (${mode}) cerută de ${auth.actorName}`,
    )
    const result = await notificationEngine.run(mode)
    return NextResponse.json(result)
  } catch (e) {
    console.log('[v0] notif-engine: eroare la rulare:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
