import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import { adminMessaging, adminDb } from '@/lib/firebase-admin'

/**
 * Logica centralizată pentru trimiterea notificărilor push prin Firebase Cloud
 * Messaging (Admin SDK). Toată logica stă aici (server-only), ca endpoint-urile
 * și componentele să rămână subțiri. Ușor de extins ulterior cu notificări
 * automate (început etapă, deadline pronosticuri, actualizare clasament).
 */
export interface PushPayload {
  title: string
  body: string
  // Date opționale livrate în notificare (ex. deep-link către o pagină).
  data?: Record<string, string>
}

export interface PushResult {
  sent: number
  failed: number
  invalidTokensRemoved: number
}

// Coduri de eroare FCM care indică un token care nu mai e valid → îl ștergem.
const INVALID_TOKEN_ERRORS = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
])

// FCM permite maximum 500 de token-uri per apel multicast.
const MULTICAST_BATCH = 500

function dedupe(tokens: string[]): string[] {
  return Array.from(
    new Set(tokens.filter((t) => typeof t === 'string' && t.length > 0)),
  )
}

/**
 * Nucleul: trimite către o listă de token-uri, curăță token-urile invalide.
 * `owners` (token → set de userId) permite ștergerea țintită a token-urilor
 * invalide; dacă lipsește, le căutăm în Firestore (array-contains).
 */
async function sendToTokens(
  tokensRaw: string[],
  payload: PushPayload,
  owners?: Map<string, Set<string>>,
): Promise<PushResult> {
  const tokens = dedupe(tokensRaw)
  if (!tokens.length) return { sent: 0, failed: 0, invalidTokensRemoved: 0 }

  const messaging = adminMessaging()
  let sent = 0
  let failed = 0
  const invalidTokens: string[] = []

  for (let i = 0; i < tokens.length; i += MULTICAST_BATCH) {
    const batch = tokens.slice(i, i + MULTICAST_BATCH)
    const res = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title: payload.title, body: payload.body },
      data: payload.data,
      android: { priority: 'high' },
      apns: { payload: { aps: { sound: 'default' } } },
    })
    sent += res.successCount
    failed += res.failureCount
    res.responses.forEach((r, idx) => {
      if (!r.success && r.error && INVALID_TOKEN_ERRORS.has(r.error.code)) {
        invalidTokens.push(batch[idx])
      }
    })
  }

  const invalidTokensRemoved = await removeInvalidTokens(invalidTokens, owners)
  return { sent, failed, invalidTokensRemoved }
}

async function removeInvalidTokens(
  tokensRaw: string[],
  owners?: Map<string, Set<string>>,
): Promise<number> {
  const tokens = dedupe(tokensRaw)
  if (!tokens.length) return 0

  const db = adminDb()
  let removed = 0

  for (const token of tokens) {
    let userIds: string[] = []
    if (owners?.has(token)) {
      userIds = Array.from(owners.get(token) as Set<string>)
    } else {
      const snap = await db
        .collection('users')
        .where('fcmTokens', 'array-contains', token)
        .get()
      userIds = snap.docs.map((d) => d.id)
    }
    for (const uid of userIds) {
      try {
        await db
          .collection('users')
          .doc(uid)
          .update({
            fcmTokens: FieldValue.arrayRemove(token),
            fcmUpdatedAt: Date.now(),
          })
        removed++
      } catch (e) {
        console.log(
          '[v0] push: nu am putut elimina un token invalid:',
          (e as Error).message,
        )
      }
    }
  }
  return removed
}

// Trimite către toate dispozitivele unui singur utilizator.
export async function sendToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushResult> {
  const snap = await adminDb().collection('users').doc(userId).get()
  if (!snap.exists) return { sent: 0, failed: 0, invalidTokensRemoved: 0 }
  const tokens = (snap.data()?.fcmTokens as string[]) ?? []
  const owners = new Map<string, Set<string>>()
  tokens.forEach((t) => owners.set(t, new Set([userId])))
  return sendToTokens(tokens, payload, owners)
}

// Trimite către o listă explicită de token-uri (fără proprietar cunoscut).
export async function sendToMany(
  tokens: string[],
  payload: PushPayload,
): Promise<PushResult> {
  return sendToTokens(tokens, payload)
}

// Trimite către toți utilizatorii (colectează + deduplică token-urile).
export async function sendToAll(payload: PushPayload): Promise<PushResult> {
  const snap = await adminDb().collection('users').get()
  const owners = new Map<string, Set<string>>()
  const all: string[] = []
  snap.docs.forEach((d) => {
    const toks = (d.data()?.fcmTokens as string[]) ?? []
    toks.forEach((t) => {
      all.push(t)
      if (!owners.has(t)) owners.set(t, new Set())
      owners.get(t)?.add(d.id)
    })
  })
  return sendToTokens(all, payload, owners)
}

// Notificare de test către utilizatorul curent (autentificat).
export async function sendTestToCurrentUser(
  userId: string,
): Promise<PushResult> {
  return sendToUser(userId, {
    title: 'Test Push',
    body: 'Notificările Push funcționează.',
  })
}
