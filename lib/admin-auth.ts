import 'server-only'
import type { NextRequest } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Autorizarea cererilor către endpoint-urile de administrare.
 *
 * Aplicația nu are sesiune server-side (autentificarea e client-side, în
 * localStorage), deci verificăm rolul de admin re-citind documentul
 * utilizatorului din Firestore — sursa de adevăr — pe baza unui `actorId`
 * primit de la client. Nu ne bazăm niciodată pe un flag `isAdmin` trimis de
 * client.
 *
 * Suportăm și un bypass server-to-server prin CRON_SECRET (pentru automatizări
 * viitoare: început de etapă, deadline pronosticuri etc.).
 */
export interface AdminAuthResult {
  ok: boolean
  actorId?: string
  actorName?: string
  reason?: string
}

export async function authorizeAdminRequest(
  req: NextRequest,
  actorIdFromBody?: string,
): Promise<AdminAuthResult> {
  // 1) Bypass server-to-server cu CRON_SECRET (header x-push-secret sau Bearer).
  const secret = process.env.CRON_SECRET
  if (secret) {
    const header = req.headers.get('x-push-secret')
    const auth = req.headers.get('authorization')
    if (header === secret || auth === `Bearer ${secret}`) {
      return { ok: true, actorName: 'system (cron)' }
    }
  }

  // 2) Actor uman: verificăm rolul din Firestore.
  const actorId =
    actorIdFromBody || req.headers.get('x-actor-id') || undefined
  if (!actorId) {
    return { ok: false, reason: 'Lipsește identitatea (actorId).' }
  }

  const snap = await adminDb().collection('users').doc(actorId).get()
  if (!snap.exists) {
    return { ok: false, reason: 'Utilizator inexistent.' }
  }

  const data = snap.data() ?? {}
  const isAdmin = data.isAdmin === true || data.role === 'admin'
  if (!isAdmin) {
    return { ok: false, reason: 'Acces interzis: doar administratorii.' }
  }

  return {
    ok: true,
    actorId,
    actorName: (data.name as string) || (data.username as string) || actorId,
  }
}
