import { type NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isValidEmail, normalizeEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Generează un link de resetare parolă (Firebase Admin) pentru un user migrat.
 * Nu trimite email — returnează linkul ca adminul să-l copieze manual.
 *
 * Body: { userId: string, actorId: string }
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    userId?: string
    actorId?: string
  }

  let authResult
  try {
    authResult = await authorizeAdminRequest(req, body.actorId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
  if (!authResult.ok) {
    return NextResponse.json(
      { error: authResult.reason ?? 'Neautorizat' },
      { status: 401 },
    )
  }

  const userId = body.userId?.trim()
  if (!userId) {
    return NextResponse.json({ error: 'Lipsește userId.' }, { status: 400 })
  }

  try {
    const snap = await adminDb().collection('users').doc(userId).get()
    if (!snap.exists) {
      return NextResponse.json(
        { error: 'Utilizator inexistent.' },
        { status: 404 },
      )
    }

    const data = snap.data() ?? {}
    const authUid =
      typeof data.authUid === 'string' ? data.authUid.trim() : ''
    const emailRaw = typeof data.email === 'string' ? data.email : ''

    if (!authUid) {
      return NextResponse.json(
        {
          error:
            'Utilizatorul nu este migrat la Firebase Authentication (lipsește authUid).',
        },
        { status: 400 },
      )
    }
    if (!isValidEmail(emailRaw)) {
      return NextResponse.json(
        { error: 'Utilizatorul nu are un email valid pe profil.' },
        { status: 400 },
      )
    }

    const email = normalizeEmail(emailRaw)

    try {
      const authUser = await adminAuth().getUser(authUid)
      const authEmail = authUser.email ? normalizeEmail(authUser.email) : ''
      if (authEmail && authEmail !== email) {
        return NextResponse.json(
          {
            error:
              'Emailul din Firestore nu corespunde contului Firebase Auth. Actualizează profilul înainte de resetare.',
          },
          { status: 409 },
        )
      }
    } catch {
      return NextResponse.json(
        {
          error:
            'Contul Firebase Authentication nu a fost găsit pentru authUid.',
        },
        { status: 404 },
      )
    }

    const resetLink = await adminAuth().generatePasswordResetLink(email)

    return NextResponse.json({
      ok: true,
      resetLink,
      email,
      userId,
      generatedBy: authResult.actorName ?? authResult.actorId,
    })
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'Eroare la generarea linkului.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
