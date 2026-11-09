import { NextRequest, NextResponse } from 'next/server'
import { adminDeniedResponse, authorizeAdminRequest } from '@/lib/admin-auth'
import { sendTestToCurrentUser } from '@/lib/push/sendPushNotification'

// Test push doar pentru administratorul autentificat, către propriile
// dispozitive. Nu acceptă CRON_SECRET (nici în query), userId arbitrar sau
// token FCM arbitrar. Dacă tokenul sau configurația Admin lipsesc, refuză.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let auth
  try {
    auth = await authorizeAdminRequest(req)
  } catch {
    return NextResponse.json(
      { error: 'Configurarea serverului este incompletă. Acces refuzat.' },
      { status: 401 },
    )
  }
  if (!auth.ok || !auth.actorId) {
    return adminDeniedResponse(auth)
  }

  const body = (await req.json().catch(() => ({}))) as {
    userId?: string
    token?: string
  }
  if (body.token) {
    return NextResponse.json(
      { error: 'Trimiterea către un token arbitrar nu este permisă.' },
      { status: 400 },
    )
  }
  if (body.userId && body.userId !== auth.actorId) {
    return NextResponse.json(
      { error: 'Poți trimite testul doar către propriul cont.' },
      { status: 403 },
    )
  }

  try {
    const result = await sendTestToCurrentUser(auth.actorId)
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json(
      { error: 'Nu am putut trimite notificarea de test.' },
      { status: 500 },
    )
  }
}
