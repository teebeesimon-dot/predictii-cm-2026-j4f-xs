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
  addDoc,
  doc,
  getDoc,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { AppUser } from '@/lib/types'

interface SessionUser {
  id: string
  username: string
  isAdmin: boolean
}

interface AuthContextValue {
  user: SessionUser | null
  loading: boolean
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  register: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STORAGE_KEY = 'cm2026_session'

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
      persist({ id: docSnap.id, username: data.username, isAdmin: !!data.isAdmin })
      return { ok: true }
    },
    [persist],
  )

  const register = useCallback(
    async (username: string, password: string) => {
      const uname = username.trim().toLowerCase()
      if (uname.length < 3) {
        return { ok: false, error: 'Utilizatorul trebuie să aibă minim 3 caractere.' }
      }
      if (password.length < 4) {
        return { ok: false, error: 'Parola trebuie să aibă minim 4 caractere.' }
      }
      const q = query(collection(db, 'users'), where('username', '==', uname))
      const snap = await getDocs(q)
      if (!snap.empty) {
        return { ok: false, error: 'Acest utilizator există deja.' }
      }
      // First ever user becomes admin
      const allUsers = await getDocs(collection(db, 'users'))
      const isAdmin = allUsers.empty
      const ref = await addDoc(collection(db, 'users'), {
        username: uname,
        password,
        isAdmin,
        createdAt: Date.now(),
      })
      persist({ id: ref.id, username: uname, isAdmin })
      return { ok: true }
    },
    [persist],
  )

  const logout = useCallback(() => persist(null), [persist])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
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
