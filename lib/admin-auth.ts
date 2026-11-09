import 'server-only'
import type { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase-admin-notifications'

/**
 * Autorizarea cererilor către endpoint-urile de administrare.
 *
 * Identitatea se dovedește cu un ID token Firebase (header
 * `Authorization: Bearer <idToken>`), verificat criptografic cu Admin SDK.
 * Din token obținem `uid`-ul Auth, găsim documentul `users` cu `authUid == uid`
 * și verificăm rolul de admin în Firestore (sursa de adevăr).
 *
 * Un `actorId` trimis de client NU mai este folosit: era doar un id de document
 * Firestore, deci oricine îl afla putea impersona un admin.
 *
 * Rămâne bypass-ul server-to-server prin CRON_SECRET (automatizări).
 */
export interface AdminAuthResult {
  ok: boolean
  actorId?: string
  actorName?: string
  reason?: string
}

const SIGN_IN_AGAIN =
  'Sesiune invalidă sau expirată. Deconectează-te și autentifică-te din nou (Google sau Email).'

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match ? match[1].trim() : null
}

// Al doilea parametru este păstrat doar pentru compatibilitate cu apelanții
// existenți; este ignorat intenționat.
export async function authorizeAdminRequest(
  req: NextRequest,
  _ignoredActorId?: string,
): Promise<AdminAuthResult> {
  const token = bearerToken(req)

  // 1) Bypass server-to-server cu CRON_SECRET (header x-push-secret sau Bearer).
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = req.headers.get('x-push-secret')
    if (header === secret || token === secret) {
      return { ok: true, actorName: 'system (cron)' }
    }
  }

  // 2) Admin uman: ID token Firebase verificat.
  if (!token) {
    return { ok: false, reason: SIGN_IN_AGAIN }
  }

  let authUid: string
  try {
    // Import dinamic: modulul cu firebase-admin/auth se încarcă doar aici.
    const { adminAuth } = await import('@/lib/firebase-admin')
    const decoded = await adminAuth().verifyIdToken(token)
    authUid = decoded.uid
  } catch {
    return { ok: false, reason: SIGN_IN_AGAIN }
  }

  const snap = await adminDb()
    .collection('users')
    .where('authUid', '==', authUid)
    .limit(1)
    .get()
  if (snap.empty) {
    return {
      ok: false,
      reason: 'Contul Auth nu este legat de un profil SKUPA.',
    }
  }

  const doc = snap.docs[0]
  const data = doc.data() ?? {}
  const isAdmin = data.isAdmin === true || data.role === 'admin'
  if (!isAdmin) {
    return { ok: false, reason: 'Acces interzis: doar administratorii.' }
  }

  return {
    ok: true,
    actorId: doc.id,
    actorName: (data.name as string) || (data.username as string) || doc.id,
  }
}
