import 'server-only'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { getFirestore } from 'firebase-admin/firestore'
import { loadFirebaseServiceAccount } from '@/lib/firebase-admin-credentials'

/**
 * Inițializare Firebase Admin SDK (server-side), o singură dată.
 *
 * Credențiale (în ordine):
 * 1. FIREBASE_SERVICE_ACCOUNT — JSON string (Vercel + local)
 * 2. Fișier local (doar off-Vercel) — vezi lib/firebase-admin-credentials.ts
 *
 * NU se loghează niciodată conținutul cheii. Nu se exportă spre client.
 */
let cachedApp: App | null = null

function getAdminApp(): App {
  if (cachedApp) return cachedApp
  const existing = getApps()
  if (existing.length) {
    cachedApp = existing[0]
    return cachedApp
  }

  const serviceAccount = loadFirebaseServiceAccount()

  cachedApp = initializeApp({
    credential: cert(serviceAccount),
  })
  return cachedApp
}

export function adminMessaging() {
  return getMessaging(getAdminApp())
}

export function adminDb() {
  return getFirestore(getAdminApp())
}
