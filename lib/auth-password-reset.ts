import { FirebaseError } from 'firebase/app'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { isValidEmail, normalizeEmail } from '@/lib/email'

/** Mesaj neutru — nu dezvăluie dacă emailul există în Auth. */
export const PASSWORD_RESET_GENERIC_SUCCESS =
  'Dacă există un cont asociat acestei adrese de email, vei primi un email pentru resetarea parolei.'

/**
 * Trimite email de resetare via Firebase Auth (client SDK).
 * Pentru user-not-found / invalid-credential returnează tot succes generic.
 */
export async function requestPasswordResetEmail(
  email: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const raw = email.trim()
  if (!raw) {
    return { ok: false, error: 'Introdu adresa de email.' }
  }
  if (!isValidEmail(raw)) {
    return { ok: false, error: 'Adresa de email nu este validă.' }
  }

  const normalized = normalizeEmail(raw)
  try {
    await sendPasswordResetEmail(auth, normalized)
    return { ok: true, message: PASSWORD_RESET_GENERIC_SUCCESS }
  } catch (err) {
    if (err instanceof FirebaseError) {
      // Nu dezvăluim existența contului.
      if (
        err.code === 'auth/user-not-found' ||
        err.code === 'auth/invalid-email' ||
        err.code === 'auth/invalid-credential'
      ) {
        return { ok: true, message: PASSWORD_RESET_GENERIC_SUCCESS }
      }
      if (err.code === 'auth/too-many-requests') {
        return {
          ok: false,
          error: 'Prea multe încercări. Așteaptă puțin și încearcă din nou.',
        }
      }
      if (err.code === 'auth/network-request-failed') {
        return {
          ok: false,
          error: 'Eroare de rețea. Verifică conexiunea și încearcă din nou.',
        }
      }
    }
    return {
      ok: false,
      error: 'Nu am putut trimite emailul. Încearcă din nou.',
    }
  }
}

export function isUserMigratedForPasswordReset(user: {
  authUid?: string
  email?: string
}): boolean {
  return Boolean(user.authUid && user.email)
}
