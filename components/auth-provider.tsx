'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react'
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AppUser } from '@/lib/types'
import { isUserAdmin } from '@/lib/types'
import { seedUsersIfEmpty, DEFAULT_PASSWORD } from '@/lib/data'

interface SessionUser {
  id: string
  username: string
  name: string
  isAdmin: boolean
  mustChangePassword: boolean
}

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  // Reîncarcă datele contului din Firestore (ex. după schimbarea parolei).
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'cm2026_session'

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      // ignore
    }
    setLoading(false)
  }, [])

  const persist = useCallback((u: SessionUser | null) => {
    setUser(u)
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      const uname = username.trim().toLowerCase()
      if (!uname || !password) {
        return { ok: false, error: 'Completează utilizatorul și parola.' }
      }
      // Ensure the fixed participants + admin account exist on first ever login.
      await seedUsersIfEmpty()
      const q = query(collection(db, 'users'), where('username', '==', uname))
      const snap = await getDocs(q)
      if (snap.empty) {
        return { ok: false, error: 'Utilizator inexistent.' }
      }
      const docSnap = snap.docs[0]
      const data = docSnap.data() as AppUser
      if (data.password !== password) {
        return { ok: false, error: 'Parolă incorectă.' }
      }
      persist({
        id: docSnap.id,
        username: data.username,
        name: data.name || data.username,
        isAdmin: isUserAdmin(data),
        mustChangePassword: needsPasswordChange(data),
      })
      return { ok: true }
    },
    [persist],
  )

  const logout = useCallback(() => persist(null), [persist])

  // Reîncarcă datele contului curent din Firestore și actualizează sesiunea.
  const refreshSession = useCallback(async () => {
    setUser((current) => {
      if (!current) return current
      // Reîncărcare asincronă; actualizăm după ce sosesc datele.
      void (async () => {
        const ref = doc(db, 'users', current.id)
        const snap = await getDoc(ref)
        if (!snap.exists()) return
        const data = snap.data() as AppUser
        persist({
          id: current.id,
          username: data.username,
          name: data.name || data.username,
          isAdmin: isUserAdmin(data),
          mustChangePassword: needsPasswordChange(data),
        })
      })()
      return current
    })
  }, [persist])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshSession }}>
      {children}
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
