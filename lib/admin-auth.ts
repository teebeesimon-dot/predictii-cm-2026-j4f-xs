import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-notifications'

/**
 * Autorizarea cererilor către endpoint-urile de administrare.
 *
 * Identitatea se dovedește doar cu un ID token Firebase
 * (`Authorization: Bearer <idToken>`), verificat criptografic. Din token
 * obținem `uid`-ul Auth, găsim documentul `users` cu `authUid == uid` și
 * verificăm rolul de admin în Firestore.
 *
 * `actorId` trimis de client este ignorat. `CRON_SECRET` nu autorizează
 * aceste rute: secretul rămâne doar pe endpoint-urile cron.
 */
export interface AdminAuthResult {
  ok: boolean
  /** 401 = sesiune lipsă/invalidă. 403 = token valid, fără rol de admin. */
  status?: 401 | 403
  actorId?: string
  actorName?: string
  reason?: string
}

const SIGN_IN_AGAIN =
  'Sesiune invalidă sau expirată. Deconectează-te și autentifică-te din nou (Google sau Email).'

const NOT_ADMIN = 'Acces interzis: doar administratorii.'

const CONFIG_REFUSED = 'Configurarea serverului este incompletă. Acces refuzat.'

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1].trim() : null
}

function denied(status: 401 | 403, reason: string): AdminAuthResult {
  return { ok: false, status, reason }
}

// Al doilea parametru este păstrat doar pentru compatibilitate cu apelanții
// existenți; este ignorat intenționat.
export async function authorizeAdminRequest(
  req: NextRequest,
  _ignoredActorId?: string,
): Promise<AdminAuthResult> {
  const token = bearerToken(req)
  if (!token) return denied(401, SIGN_IN_AGAIN)

  let authUid: string
  try {
    const { adminAuth } = await import('@/lib/firebase-admin')
    const decoded = await adminAuth().verifyIdToken(token)
    authUid = decoded.uid
  } catch {
    // Token invalid, expirat, sau credențiale Admin lipsă. Refuzăm fără a
    // expune numele variabilei sau conținutul configurației.
    return denied(401, SIGN_IN_AGAIN)
  }

  try {
    const snap = await adminDb()
      .collection('users')
      .where('authUid', '==', authUid)
      .limit(1)
      .get()
    if (snap.empty) {
      return denied(403, 'Contul Auth nu este legat de un profil SKUPA.')
    }

    const doc = snap.docs[0]
    const data = doc.data() ?? {}
    const isAdmin = data.isAdmin === true || data.role === 'admin'
    if (!isAdmin) return denied(403, NOT_ADMIN)

    return {
      ok: true,
      actorId: doc.id,
      actorName: (data.name as string) || (data.username as string) || doc.id,
    }
  } catch (error) {
    const err = error as { code?: unknown; message?: unknown }
    console.error('[admin-auth] Firestore admin lookup failed', {
      code: typeof err?.code === 'string' ? err.code : 'unknown',
      message: typeof err?.message === 'string' ? err.message : 'Unknown Firestore error',
    })
    return denied(401, CONFIG_REFUSED)
  }
}

export function adminDeniedResponse(auth: AdminAuthResult): NextResponse {
  const status = auth.status === 403 ? 403 : 401
  return NextResponse.json(
    { error: auth.reason ?? (status === 403 ? NOT_ADMIN : SIGN_IN_AGAIN) },
    { status },
  )
}
