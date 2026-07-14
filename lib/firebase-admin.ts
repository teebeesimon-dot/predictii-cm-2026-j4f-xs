import 'server-only'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Inițializare Firebase Admin SDK (server-side), o singură dată.
 *
 * Necesită variabila de mediu FIREBASE_SERVICE_ACCOUNT — conținutul JSON complet
 * al unui service account din Firebase Console → Project Settings → Service
 * accounts → Generate new private key. NU se loghează niciodată conținutul.
 */
let cachedApp: App | null = null

function getAdminApp(): App {
  if (cachedApp) return cachedApp
  const existing = getApps()
  if (existing.length) {
    cachedApp = existing[0]
    return cachedApp
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT nu este setat. Adaugă JSON-ul service account în variabilele de mediu.',
    )
  }

  let serviceAccount: Record<string, unknown>
  try {
    serviceAccount = JSON.parse(raw)
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT nu este un JSON valid.')
  }

  cachedApp = initializeApp({
    credential: cert(serviceAccount as Parameters<typeof cert>[0]),
  })
  return cachedApp
}

export function adminMessaging() {
  return getMessaging(getAdminApp())
}

export function adminDb() {
  return getFirestore(getAdminApp())
}
