import 'server-only'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'
import { getFirestore } from 'firebase-admin/firestore'
import { loadFirebaseServiceAccount } from '@/lib/firebase-admin-credentials'

/**
 * Firebase Admin minimal pentru fluxul de notificari.
 * Nu importa firebase-admin/auth: acest modul este folosit de cron si FCM.
 */
let cachedApp: App | null = null

function getNotificationAdminApp(): App {
  if (cachedApp) return cachedApp
  const existing = getApps()
  if (existing.length) {
    cachedApp = existing[0]
    return cachedApp
  }

  const serviceAccount = loadFirebaseServiceAccount()
  cachedApp = initializeApp({ credential: cert(serviceAccount) })
  return cachedApp
}

export function adminMessaging() {
  return getMessaging(getNotificationAdminApp())
}

export function adminDb() {
  return getFirestore(getNotificationAdminApp())
}
