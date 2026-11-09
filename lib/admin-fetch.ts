import { auth } from '@/lib/firebase'

/**
 * fetch către endpoint-urile /api/admin/* cu ID token-ul Firebase al
 * utilizatorului curent în `Authorization: Bearer`. Serverul îl verifică și
 * apoi confirmă rolul de admin din Firestore.
 */
export async function adminFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  await auth.authStateReady()
  const token = await auth.currentUser?.getIdToken()

  const headers = new Headers(init.headers)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  return fetch(input, { ...init, headers })
}
