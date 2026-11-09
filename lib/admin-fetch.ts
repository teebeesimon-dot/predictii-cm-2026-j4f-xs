import { auth } from '@/lib/firebase'

const SIGN_IN_AGAIN =
  'Sesiune invalidă sau expirată. Deconectează-te și autentifică-te din nou (Google sau Email).'

const NOT_ADMIN = 'Acces interzis: doar administratorii.'

/** 401 = sesiune lipsă sau respinsă. 403 = sesiune validă, fără rol de admin. */
export class AdminFetchError extends Error {
  readonly status: 401 | 403

  constructor(status: 401 | 403, message: string) {
    super(message)
    this.name = 'AdminFetchError'
    this.status = status
  }
}

/**
 * fetch către endpoint-urile de administrare, cu ID token-ul Firebase.
 * O singură cerere: nu reîncearcă după 401/403 și nu forțează refresh-ul
 * tokenului ca să evite o buclă.
 */
export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) throw new AdminFetchError(401, SIGN_IN_AGAIN)

  let token: string
  try {
    token = await user.getIdToken()
  } catch {
    throw new AdminFetchError(401, SIGN_IN_AGAIN)
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(input, { ...init, headers })

  if (res.status === 401 || res.status === 403) {
    const data = (await res.json().catch(() => ({}))) as { error?: unknown }
    const serverMessage = typeof data.error === 'string' ? data.error : ''
    throw new AdminFetchError(
      res.status,
      serverMessage || (res.status === 403 ? NOT_ADMIN : SIGN_IN_AGAIN),
    )
  }

  return res
}
