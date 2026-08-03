import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ServiceAccount } from 'firebase-admin/app'

/**
 * Cale implicită (relativă la root-ul proiectului) pentru service account
 * în dezvoltare locală. Fișierul NU trebuie commit-uit.
 */
export const DEFAULT_LOCAL_SERVICE_ACCOUNT_PATH =
  'secrets/firebase-service-account.json'

/**
 * Încarcă credențialele Firebase Admin:
 * 1) FIREBASE_SERVICE_ACCOUNT (JSON string) — folosit pe Vercel și local
 * 2) fișier JSON local — doar când NU suntem pe Vercel
 *
 * Nu loghează niciodată conținutul cheii.
 */
export function loadFirebaseServiceAccount(): ServiceAccount {
  const fromEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim()
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv) as ServiceAccount
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT nu este un JSON valid.')
    }
  }

  // Deploy (Vercel): doar Environment Variables — fără citire din disc.
  if (process.env.VERCEL) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT trebuie setat în Environment Variables pe Vercel.',
    )
  }

  const configuredPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH?.trim() ||
    DEFAULT_LOCAL_SERVICE_ACCOUNT_PATH
  const absolutePath = resolve(process.cwd(), configuredPath)

  if (!existsSync(absolutePath)) {
    throw new Error(
      `FIREBASE_SERVICE_ACCOUNT lipsește, iar fișierul local nu a fost găsit (${configuredPath}). ` +
        `Pentru dezvoltare locală, copiază JSON-ul service account la ` +
        `${DEFAULT_LOCAL_SERVICE_ACCOUNT_PATH} sau setează FIREBASE_SERVICE_ACCOUNT / FIREBASE_SERVICE_ACCOUNT_PATH.`,
    )
  }

  try {
    const raw = readFileSync(absolutePath, 'utf8')
    return JSON.parse(raw) as ServiceAccount
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(
        `Fișierul service account (${configuredPath}) nu conține JSON valid.`,
      )
    }
    throw err
  }
}
