import { NextRequest, NextResponse } from 'next/server'
import { adminMessaging, adminDb } from '@/lib/firebase-admin'

// Endpoint de test pentru trimiterea unei notificări push prin Firebase Cloud
// Messaging.
//
// Utilizare (POST, JSON body):
//   { "userId": "<id>" }            → trimite către toate dispozitivele userului
//   { "token": "<fcmToken>" }       → trimite direct către un token anume
//   opțional: "title", "body"       → conținutul notificării
//
// Securizare: dacă CRON_SECRET este setat, cererea trebuie să-l includă în:
//   - header  x-push-secret: <secret>
//   - header  Authorization: Bearer <secret>
//   - query   ?secret=<secret>
// Dacă CRON_SECRET NU e setat (ex. în dezvoltare), endpoint-ul rămâne deschis.
//
// Necesită și FIREBASE_SERVICE_ACCOUNT (vezi lib/firebase-admin.ts).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  // Dacă nu e configurat niciun secret, permitem (util pentru testare locală).
  if (!secret) return true

  const headerSecret = req.headers.get('x-push-secret')
  if (headerSecret && headerSecret === secret) return true

  const auth = req.headers.get('authorization')
  if (auth && auth === `Bearer ${secret}`) return true

  const querySecret = req.nextUrl.searchParams.get('secret')
  if (querySecret && querySecret === secret) return true

  return false
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 })
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string
      token?: string
      title?: string
      body?: string
    }

    // Colectăm token-urile țintă: fie direct, fie de la userul din Firestore.
    let tokens: string[] = []
    if (body.token) {
      tokens = [body.token]
    } else if (body.userId) {
      const snap = await adminDb().collection('users').doc(body.userId).get()
      const data = snap.data()
      tokens = (data?.fcmTokens ?? []) as string[]
    }

    if (!tokens.length) {
      return NextResponse.json(
        { error: 'Niciun token FCM găsit. Trimite "token" sau "userId".' },
        { status: 400 },
      )
    }

    const response = await adminMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: body.title || 'Test Just4Fun',
        body: body.body || 'Aceasta este o notificare de test FCM.',
      },
      android: {
        priority: 'high',
      },
    })

    return NextResponse.json({
      ok: true,
      sent: tokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      // Detalii per token (fără a expune tokenul), utile la depanare.
      results: response.responses.map((r) => ({
        success: r.success,
        error: r.error?.message,
      })),
    })
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 500 },
    )
  }
}
