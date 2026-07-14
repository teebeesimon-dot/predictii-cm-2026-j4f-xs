import { type NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { sendTestToCurrentUser } from '@/lib/push/sendPushNotification'

// Trimite o notificare de test către utilizatorul autentificat (adminul care
// apasă butonul). Body: { "actorId": "..." }.
// Titlu: "Test Push" · Mesaj: "Notificările Push funcționează."
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
  if (!auth.actorId) {
    return NextResponse.json(
      { error: 'Lipsește utilizatorul curent pentru testul de notificare.' },
      { status: 400 },
    )
  }

  try {
    console.log(
      `[v0] push: TEST trimis de ${auth.actorName} @ ${new Date().toISOString()}`,
    )
    const result = await sendTestToCurrentUser(auth.actorId)
    console.log(
      `[v0] push: test — sent=${result.sent} failed=${result.failed} invalidTokensRemoved=${result.invalidTokensRemoved}`,
    )
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.log('[v0] push: eroare la testul de notificare:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
