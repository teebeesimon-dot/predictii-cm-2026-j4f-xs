import { type NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { sendToAll, sendToUser } from '@/lib/push/sendPushNotification'

// Endpoint de administrare pentru trimiterea notificărilor push.
//
// Body (JSON):
//   {
//     "title": "...",
//     "body": "...",
//     "userId": "...",       // trimite doar acestui utilizator
//     "sendToAll": false,    // sau trimite tuturor
//     "actorId": "..."       // id-ul adminului care trimite (verificat server-side)
//   }
//
// Răspuns: { success, sent, failed, invalidTokensRemoved }
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    title?: string
    body?: string
    userId?: string
    sendToAll?: boolean
    actorId?: string
  }

  // Securitate: doar administratorii (verificat din Firestore) sau cron.
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

  const title = (body.title ?? '').trim()
  const message = (body.body ?? '').trim()
  if (!title || !message) {
    return NextResponse.json(
      { error: 'Titlul și mesajul sunt obligatorii.' },
      { status: 400 },
    )
  }

  const when = new Date().toISOString()
  try {
    let result
    if (body.sendToAll) {
      console.log(
        `[v0] push: ${auth.actorName} trimite catre TOTI utilizatorii @ ${when} — "${title}"`,
      )
      result = await sendToAll({ title, body: message })
    } else if (body.userId) {
      console.log(
        `[v0] push: ${auth.actorName} trimite catre user ${body.userId} @ ${when} — "${title}"`,
      )
      result = await sendToUser(body.userId, { title, body: message })
    } else {
      return NextResponse.json(
        { error: 'Alege un destinatar (sendToAll sau userId).' },
        { status: 400 },
      )
    }

    console.log(
      `[v0] push: rezultat — sent=${result.sent} failed=${result.failed} invalidTokensRemoved=${result.invalidTokensRemoved}`,
    )
    return NextResponse.json({ success: true, ...result })
  } catch (e) {
    console.log('[v0] push: eroare la trimitere:', (e as Error).message)
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
