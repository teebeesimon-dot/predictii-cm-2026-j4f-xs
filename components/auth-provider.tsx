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
  onAuthStateChanged,
  signInWithCredential,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { Capacitor } from '@capacitor/core'
import { FirebaseAuthentication } from '@capacitor-firebase/authentication'
import { auth, db } from '@/lib/firebase'
import type { AppUser } from '@/lib/types'
import { isUserAdmin } from '@/lib/types'
import { seedUsersIfEmpty, DEFAULT_PASSWORD } from '@/lib/data'
import {
  assertEmailAvailableForUser,
  linkFirestoreUserToAuth,
  mapFirebaseAuthError,
  touchAuthLogin,
} from '@/lib/auth-migration'
import {
  ADMIN_FIREBASE_REQUIRED,
  ADMIN_UNLINKED,
  ADMIN_USE_FIREBASE,
  resolveSession,
  type LegacySession,
} from '@/lib/admin-session'
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
  /** Mesaj când o sesiune de administrator nu poate fi acordată. */
  authNotice: string | null
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
const NOTICE_KEY = 'cm2026_auth_notice'
const googleProvider = new GoogleAuthProvider()

async function signInWithGoogle() {
  if (!Capacitor.isNativePlatform()) {
    return signInWithPopup(auth, googleProvider)
  }

  const result = await FirebaseAuthentication.signInWithGoogle()
  const idToken = result.credential?.idToken
  if (!idToken) {
    throw new Error('Autentificarea Google nu a returnat un ID token.')
  }

  const credential = GoogleAuthProvider.credential(idToken)
  return signInWithCredential(auth, credential)
}

async function signOutFromAuth() {
  await signOut(auth)
  if (Capacitor.isNativePlatform()) {
    await FirebaseAuthentication.signOut().catch(() => undefined)
  }
}

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
  const [authNotice, setAuthNotice] = useState<string | null>(null)
  const [migrationPending, setMigrationPending] =
    useState<MigrationPending | null>(null)
  const [migrationBusy, setMigrationBusy] = useState(false)

  const persist = useCallback((u: SessionUser | null) => {
    setUser(u)
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const readStoredSession = useCallback((): LegacySession | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as Partial<SessionUser>
      if (!parsed.id || !parsed.username) return null
      return {
        id: parsed.id,
        username: parsed.username,
        name: parsed.name || parsed.username,
        isAdmin: parsed.isAdmin === true,
        mustChangePassword: parsed.mustChangePassword === true,
        viewOnly: parsed.viewOnly === true,
        hideFromStandings: parsed.hideFromStandings === true,
      }
    } catch {
      return null
    }
  }, [])

  const applyDecision = useCallback(
    (decision: ReturnType<typeof resolveSession>) => {
      if (decision.kind === 'firebase') {
        sessionStorage.removeItem(NOTICE_KEY)
        setAuthNotice(null)
        persist(sessionFromAppUser(decision.user.id, decision.user))
        return
      }
      if (decision.kind === 'legacy') {
        sessionStorage.removeItem(NOTICE_KEY)
        setAuthNotice(null)
        persist(decision.user)
        return
      }
      if (decision.kind === 'denied') {
        sessionStorage.setItem(NOTICE_KEY, decision.notice)
        setAuthNotice(decision.notice)
        persist(null)
        return
      }
      setAuthNotice(sessionStorage.getItem(NOTICE_KEY))
      persist(null)
    },
    [persist],
  )

  const profilesForUid = useCallback(async (authUid: string): Promise<AppUser[]> => {
    const snap = await getDocs(
      query(collection(db, 'users'), where('authUid', '==', authUid)),
    )
    return snap.docs.map(
      (item) =>
        ({ id: item.id, ...(item.data() as Omit<AppUser, 'id'>) }) as AppUser,
    )
  }, [])

  useEffect(() => {
    let cancelled = false
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      void (async () => {
        try {
          const decision = firebaseUser
            ? resolveSession({
                stored: readStoredSession(),
                firebaseUid: firebaseUser.uid,
                profilesForUid: await profilesForUid(firebaseUser.uid),
              })
            : resolveSession({
                stored: readStoredSession(),
                firebaseUid: null,
                profilesForUid: [],
              })
          if (cancelled) return
          applyDecision(decision)
        } catch {
          if (cancelled) return
          const stored = readStoredSession()
          if (stored?.isAdmin) {
            sessionStorage.setItem(NOTICE_KEY, ADMIN_FIREBASE_REQUIRED)
            setAuthNotice(ADMIN_FIREBASE_REQUIRED)
            persist(null)
          } else if (stored) {
            setAuthNotice(null)
            persist({ ...stored, isAdmin: false })
          } else {
            setAuthNotice(null)
            persist(null)
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    })
    return () => {
      cancelled = true
      unsub()
    }
  }, [applyDecision, persist, profilesForUid, readStoredSession])

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

      if (isUserAdmin(data)) {
        return {
          ok: false,
          error: data.authUid ? ADMIN_USE_FIREBASE : ADMIN_UNLINKED,
        }
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
        const decision = resolveSession({
          stored: null,
          firebaseUid: cred.user.uid,
          profilesForUid: await profilesForUid(cred.user.uid),
        })
        if (decision.kind !== 'firebase') {
          await signOutFromAuth()
          return {
            ok: false,
            error:
              decision.kind === 'denied'
                ? decision.notice
                : 'Contul Auth nu este legat de un profil SKUPA. Folosește utilizator + parolă pentru migrare.',
          }
        }
        await finishMigratedSession(decision.user, 'password')
        return { ok: true }
      } catch (err) {
        return { ok: false, error: authErrorMessage(err) }
      }
    },
    [finishMigratedSession, profilesForUid],
  )

  const loginWithGoogle = useCallback(async (): Promise<AuthResult> => {
    try {
      const cred = await signInWithGoogle()
      const decision = resolveSession({
        stored: null,
        firebaseUid: cred.user.uid,
        profilesForUid: await profilesForUid(cred.user.uid),
      })
      if (decision.kind !== 'firebase') {
        await signOutFromAuth()
        return {
          ok: false,
          error:
            decision.kind === 'denied'
              ? decision.notice
              : 'Nu există un cont SKUPA migrat pentru acest Google. Intră mai întâi cu utilizator + parolă și completează actualizarea contului.',
        }
      }
      await finishMigratedSession(decision.user, 'google.com')
      return { ok: true }
    } catch (err) {
      return { ok: false, error: authErrorMessage(err) }
    }
  }, [finishMigratedSession, profilesForUid])

  const completeMigrationWithGoogle = useCallback(async () => {
    if (!migrationPending) return
    if (migrationPending.isAdmin) {
      setAuthNotice(ADMIN_UNLINKED)
      setMigrationPending(null)
      return
    }
    setMigrationBusy(true)
    try {
      const cred = await signInWithGoogle()
      const firebaseUser = cred.user
      const email = firebaseUser.email
      if (!email) {
        await signOutFromAuth()
        throw new Error('Contul Google nu are o adresă de email.')
      }

      const linked = await linkFirestoreUserToAuth({
        userId: migrationPending.id,
        authUid: firebaseUser.uid,
        email,
        provider: 'google.com',
      })
      if (!linked.ok) {
        await signOutFromAuth()
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
      if (migrationPending.isAdmin) {
        setAuthNotice(ADMIN_UNLINKED)
        setMigrationPending(null)
        return { ok: false, error: ADMIN_UNLINKED }
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
          await signOutFromAuth()
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
          await signOutFromAuth()
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
    void signOutFromAuth().catch(() => undefined)
  }, [])

  const logout = useCallback(() => {
    setMigrationPending(null)
    persist(null)
    void signOutFromAuth().catch(() => undefined)
  }, [persist])

  const refreshSession = useCallback(async () => {
    setUser((current) => {
      if (!current) return current
      void (async () => {
        const ref = doc(db, 'users', current.id)
        const snap = await getDoc(ref)
        if (!snap.exists()) return
        const data = snap.data() as AppUser
        const firebaseUid = auth.currentUser?.uid
        const verifiedAdmin =
          Boolean(firebaseUid) &&
          data.authUid === firebaseUid &&
          isUserAdmin(data)
        const session = sessionFromAppUser(current.id, data)
        if (isUserAdmin(data) && !verifiedAdmin) {
          setAuthNotice(ADMIN_UNLINKED)
          persist({ ...session, isAdmin: false })
          return
        }
        persist({ ...session, isAdmin: verifiedAdmin })
      })()
      return current
    })
  }, [persist])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      authNotice,
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
      authNotice,
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
