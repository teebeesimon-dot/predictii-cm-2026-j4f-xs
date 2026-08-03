'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore'
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import type { AppUser } from '@/lib/types'
import { isUserAdmin } from '@/lib/types'
import { seedUsersIfEmpty, DEFAULT_PASSWORD } from '@/lib/data'
import {
  assertEmailAvailableForUser,
  findUserByAuthUid,
  linkFirestoreUserToAuth,
  mapFirebaseAuthError,
  touchAuthLogin,
} from '@/lib/auth-migration'
import { AuthMigrationDialog } from '@/components/auth-migration-dialog'
import { FirebaseError } from 'firebase/app'

interface SessionUser {
  id: string
  username: string
  name: string
  isAdmin: boolean
  mustChangePassword: boolean
  // Cont de supraveghere: nu poate trimite pronosticuri.
  viewOnly: boolean
  // Ascuns din clasamente pentru ceilalți (dar se vede pe sine).
  hideFromStandings: boolean
}

type AuthOk = { ok: true; needsMigration?: boolean }
type AuthFail = { ok: false; error: string }
type AuthResult = AuthOk | AuthFail

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  /** true când userul a trecut login-ul vechi și trebuie să lege Firebase Auth */
  needsAuthMigration: boolean
  login: (username: string, password: string) => Promise<AuthResult>
  loginWithEmail: (email: string, password: string) => Promise<AuthResult>
  loginWithGoogle: () => Promise<AuthResult>
  logout: () => void
  // Reîncarcă datele contului din Firestore (ex. după schimbarea parolei).
  refreshSession: () => Promise<void>
}

interface MigrationPending {
  id: string
  username: string
  name: string
  password: string
  isAdmin: boolean
  mustChangePassword: boolean
  viewOnly: boolean
  hideFromStandings: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'cm2026_session'
const googleProvider = new GoogleAuthProvider()

// Decide dacă utilizatorul trebuie forțat să-și schimbe parola: fie flag-ul
// explicit este setat, fie (pentru conturi mai vechi fără flag) parola este
// încă cea implicită. Adminul dedicat ("admin") nu este forțat.
function needsPasswordChange(data: AppUser): boolean {
  if (data.username === 'admin') return false
  if (data.mustChangePassword === true) return true
  if (data.mustChangePassword === undefined && data.password === DEFAULT_PASSWORD) {
    return true
  }
  return false
}

function sessionFromAppUser(id: string, data: AppUser): SessionUser {
  return {
    id,
    username: data.username,
    name: data.name || data.username,
    isAdmin: isUserAdmin(data),
    mustChangePassword: needsPasswordChange(data),
    viewOnly: data.viewOnly === true,
    hideFromStandings: data.hideFromStandings === true,
  }
}

function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    return mapFirebaseAuthError(err.code)
  }
  if (err instanceof Error && err.message) return err.message
  return 'Autentificarea a eșuat. Încearcă din nou.'
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [migrationPending, setMigrationPending] =
    useState<MigrationPending | null>(null)
  const [migrationBusy, setMigrationBusy] = useState(false)

  const persist = useCallback((u: SessionUser | null) => {
    setUser(u)
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw) as SessionUser)
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  const finishMigratedSession = useCallback(
    async (appUser: AppUser, provider: 'password' | 'google.com') => {
      await touchAuthLogin(appUser.id, provider)
      const snap = await getDoc(doc(db, 'users', appUser.id))
      const data = snap.exists()
        ? ({ id: snap.id, ...(snap.data() as Omit<AppUser, 'id'>) } as AppUser)
        : appUser
      persist(sessionFromAppUser(data.id, data))
    },
    [persist],
  )

  const login = useCallback(
    async (username: string, password: string): Promise<AuthResult> => {
      const uname = username.trim().toLowerCase()
      if (!uname || !password) {
        return { ok: false, error: 'Completează utilizatorul și parola.' }
      }
      await seedUsersIfEmpty()
      const q = query(collection(db, 'users'), where('username', '==', uname))
      const snap = await getDocs(q)
      if (snap.empty) {
        return { ok: false, error: 'Utilizator inexistent.' }
      }
      const docSnap = snap.docs[0]
      const data = { id: docSnap.id, ...(docSnap.data() as Omit<AppUser, 'id'>) }

      if (data.password !== password) {
        return { ok: false, error: 'Parolă incorectă.' }
      }

      // Cont deja migrat → trebuie Firebase Auth (email/Google), nu username.
      if (data.authUid) {
        return {
          ok: false,
          error:
            'Contul a fost actualizat. Folosește Email + Parolă sau Continuă cu Google.',
        }
      }

      setMigrationPending({
        id: data.id,
        username: data.username,
        name: data.name || data.username,
        password,
        isAdmin: isUserAdmin(data),
        mustChangePassword: needsPasswordChange(data),
        viewOnly: data.viewOnly === true,
        hideFromStandings: data.hideFromStandings === true,
      })
      return { ok: true, needsMigration: true }
    },
    [],
  )

  const loginWithEmail = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      if (!email.trim() || !password) {
        return { ok: false, error: 'Completează emailul și parola.' }
      }
      try {
        const cred = await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        )
        const appUser = await findUserByAuthUid(cred.user.uid)
        if (!appUser) {
          await signOut(auth)
          return {
            ok: false,
            error:
              'Contul Auth nu este legat de un profil SKUPA. Folosește utilizator + parolă pentru migrare.',
          }
        }
        await finishMigratedSession(appUser, 'password')
        return { ok: true }
      } catch (err) {
        return { ok: false, error: authErrorMessage(err) }
      }
    },
    [finishMigratedSession],
  )

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      const appUser = await findUserByAuthUid(cred.user.uid)
      if (!appUser) {
        await signOut(auth)
        return {
          ok: false,
          error:
            'Nu există un cont SKUPA migrat pentru acest Google. Intră mai întâi cu utilizator + parolă și completează actualizarea contului.',
        }
      }
      await finishMigratedSession(appUser, 'google.com')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) }
    }
  }, [finishMigratedSession])

  const completeMigrationWithGoogle = useCallback(async () => {
    if (!migrationPending) return
    setMigrationBusy(true)
    try {
      const cred = await signInWithPopup(auth, googleProvider)
      const firebaseUser = cred.user
      const email = firebaseUser.email
      if (!email) {
        await signOut(auth)
        throw new Error('Contul Google nu are o adresă de email.')
      }

      const linked = await linkFirestoreUserToAuth({
        userId: migrationPending.id,
        authUid: firebaseUser.uid,
        email,
        provider: 'google.com',
      })
      if (!linked.ok) {
        await signOut(auth)
        throw new Error(linked.error)
      }

      const pending = migrationPending
      setMigrationPending(null)
      persist({
        id: pending.id,
        username: pending.username,
        name: pending.name,
        isAdmin: pending.isAdmin,
        mustChangePassword: pending.mustChangePassword,
        viewOnly: pending.viewOnly,
        hideFromStandings: pending.hideFromStandings,
      })
    } finally {
      setMigrationBusy(false)
    }
  }, [migrationPending, persist])

  const completeMigrationWithEmail = useCallback(
    async (email: string): Promise<AuthResult> => {
      if (!migrationPending) {
        return { ok: false, error: 'Sesiunea de migrare a expirat. Autentifică-te din nou.' }
      }

      const emailCheck = await assertEmailAvailableForUser(
        email,
        migrationPending.id,
      )
      if (!emailCheck.ok) return emailCheck

      setMigrationBusy(true)
      try {
        let firebaseUser: FirebaseUser
        try {
          const cred = await createUserWithEmailAndPassword(
            auth,
            emailCheck.email,
            migrationPending.password,
          )
          firebaseUser = cred.user
          try {
            await sendEmailVerification(cred.user)
          } catch {
            // Verificarea e secundară — migrarea continuă chiar dacă emailul
            // de verificare nu poate fi trimis acum.
          }
        } catch (err) {
          // Cont Auth existent cu aceeași parolă → refolosim (fără doc Firestore nou).
          if (
            err instanceof FirebaseError &&
            err.code === 'auth/email-already-in-use'
          ) {
            const existing = await signInWithEmailAndPassword(
              auth,
              emailCheck.email,
              migrationPending.password,
            )
            firebaseUser = existing.user
          } else {
            throw err
          }
        }

        const linked = await linkFirestoreUserToAuth({
          userId: migrationPending.id,
          authUid: firebaseUser.uid,
          email: emailCheck.email,
          provider: 'password',
        })
        if (!linked.ok) {
          await signOut(auth)
          return linked
        }

        const pending = migrationPending
        setMigrationPending(null)
        persist({
          id: pending.id,
          username: pending.username,
          name: pending.name,
          isAdmin: pending.isAdmin,
          mustChangePassword: pending.mustChangePassword,
          viewOnly: pending.viewOnly,
          hideFromStandings: pending.hideFromStandings,
        })
        return { ok: true }
      } catch (err) {
        try {
          await signOut(auth)
        } catch {
          // ignore
        }
        return { ok: false, error: authErrorMessage(err) }
      } finally {
        setMigrationBusy(false)
      }
    },
    [migrationPending, persist],
  )

  const cancelMigration = useCallback(() => {
    setMigrationPending(null)
    void signOut(auth).catch(() => undefined)
  }, [])

  const logout = useCallback(() => {
    setMigrationPending(null)
    persist(null)
    void signOut(auth).catch(() => undefined)
  }, [persist])

  const refreshSession = useCallback(async () => {
    setUser((current) => {
      if (!current) return current
      void (async () => {
        const ref = doc(db, 'users', current.id)
        const snap = await getDoc(ref)
        if (!snap.exists()) return
        const data = snap.data() as AppUser
        persist(sessionFromAppUser(current.id, data))
      })()
      return current
    })
  }, [persist])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      needsAuthMigration: migrationPending !== null,
      login,
      loginWithEmail,
      loginWithGoogle,
      logout,
      refreshSession,
    }),
    [
      user,
      loading,
      migrationPending,
      login,
      loginWithEmail,
      loginWithGoogle,
      logout,
      refreshSession,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {migrationPending && (
        <AuthMigrationDialog
          username={migrationPending.username}
          busy={migrationBusy}
          onGoogle={completeMigrationWithGoogle}
          onEmail={completeMigrationWithEmail}
          onCancel={cancelMigration}
        />
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// helper to fetch a user doc (used elsewhere)
export async function fetchUser(id: string): Promise<AppUser | null> {
  const ref = doc(db, 'users', id)
  const snap = await getDoc(ref)
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as Omit<AppUser, 'id'>) }
}
