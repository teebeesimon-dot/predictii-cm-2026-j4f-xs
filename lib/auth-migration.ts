import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { isValidEmail, normalizeEmail } from '@/lib/email'
import type { AppUser } from '@/lib/types'

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email)
  const snap = await getDocs(
    query(collection(db, 'users'), where('email', '==', normalized), limit(1)),
  )
  if (snap.empty) return null
  return snap.docs[0].id
}

export async function findUserByAuthUid(
  authUid: string,
): Promise<AppUser | null> {
  const snap = await getDocs(
    query(collection(db, 'users'), where('authUid', '==', authUid), limit(1)),
  )
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...(d.data() as Omit<AppUser, 'id'>) }
}

/** Verifică că emailul nu e folosit de alt document users. */
export async function assertEmailAvailableForUser(
  email: string,
  currentUserId: string,
): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Adresa de email nu este validă.' }
  }
  const normalized = normalizeEmail(email)
  const existingId = await findUserIdByEmail(normalized)
  if (existingId && existingId !== currentUserId) {
    return {
      ok: false,
      error: 'Acest email este deja asociat altui cont.',
    }
  }
  return { ok: true, email: normalized }
}

/** Verifică că authUid nu e deja legat de alt document users. */
export async function assertAuthUidAvailableForUser(
  authUid: string,
  currentUserId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const existing = await findUserByAuthUid(authUid)
  if (existing && existing.id !== currentUserId) {
    return {
      ok: false,
      error: 'Acest cont Google/Auth este deja asociat altui utilizator.',
    }
  }
  return { ok: true }
}

export type AuthProviderId = 'password' | 'google.com'

/**
 * Leagă documentul Firestore existent de un cont Firebase Auth.
 * Nu creează document nou și nu schimbă id-ul documentului.
 */
export async function linkFirestoreUserToAuth(params: {
  userId: string
  authUid: string
  email: string
  provider: AuthProviderId
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const emailCheck = await assertEmailAvailableForUser(
    params.email,
    params.userId,
  )
  if (!emailCheck.ok) return emailCheck

  const uidCheck = await assertAuthUidAvailableForUser(
    params.authUid,
    params.userId,
  )
  if (!uidCheck.ok) return uidCheck

  const now = Date.now()
  const lastLoginProvider =
    params.provider === 'google.com' ? 'google' : 'password'

  await updateDoc(doc(db, 'users', params.userId), {
    authUid: params.authUid,
    email: emailCheck.email,
    authProviders: [params.provider],
    migratedAt: now,
    lastLoginProvider,
    lastLoginAt: now,
  })

  return { ok: true }
}

/** Actualizează doar timestamp-urile de login Auth (user deja migrat). */
export async function touchAuthLogin(
  userId: string,
  provider: AuthProviderId,
): Promise<void> {
  await updateDoc(doc(db, 'users', userId), {
    lastLoginProvider: provider === 'google.com' ? 'google' : 'password',
    lastLoginAt: Date.now(),
  })
}

export function mapFirebaseAuthError(code: string | undefined): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Acest email este deja folosit în Firebase Authentication.'
    case 'auth/invalid-email':
      return 'Adresa de email nu este validă.'
    case 'auth/weak-password':
      return 'Parola este prea slabă pentru Firebase Authentication.'
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Email sau parolă incorectă.'
    case 'auth/popup-closed-by-user':
      return 'Autentificarea Google a fost anulată.'
    case 'auth/popup-blocked':
      return 'Popup-ul Google a fost blocat de browser.'
    case 'auth/account-exists-with-different-credential':
      return 'Există deja un cont cu acest email. Folosește Email + Parolă, apoi leagă Google din cont.'
    case 'auth/network-request-failed':
      return 'Eroare de rețea. Încearcă din nou.'
    default:
      return 'Autentificarea a eșuat. Încearcă din nou.'
  }
}
