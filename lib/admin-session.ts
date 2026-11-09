import type { AppUser } from '@/lib/types'

export const ADMIN_FIREBASE_REQUIRED =
  'Sesiunea de administrator necesită autentificare Firebase (Email sau Google). Accesul nu a fost acordat.'

export const ADMIN_UNLINKED =
  'Contul de administrator nu are authUid și nu poate fi asociat în siguranță. Accesul nu a fost acordat.'

export const ADMIN_AMBIGUOUS =
  'Contul Firebase nu poate fi asociat în siguranță unui singur profil. Accesul de administrator nu a fost acordat.'

export const ADMIN_USE_FIREBASE =
  'Contul de administrator folosește Firebase Authentication. Intră cu Email + Parolă sau Continuă cu Google.'

export interface LegacySession {
  id: string
  username: string
  name: string
  isAdmin: boolean
  mustChangePassword: boolean
  viewOnly: boolean
  hideFromStandings: boolean
}

export type SessionDecision =
  | { kind: 'firebase'; user: AppUser }
  | { kind: 'legacy'; user: LegacySession }
  | { kind: 'denied'; notice: string }
  | { kind: 'none' }

/**
 * Acordă rolul de admin doar dacă există exact un profil Firestore al cărui
 * authUid este UID-ul Firebase curent. Sesiunea din localStorage nu poate
 * promova un administrator.
 */
export function resolveSession(input: {
  stored: LegacySession | null
  firebaseUid: string | null
  profilesForUid: AppUser[]
}): SessionDecision {
  const { stored, firebaseUid, profilesForUid } = input

  if (firebaseUid) {
    if (profilesForUid.length !== 1) {
      if (stored && !stored.isAdmin) {
        return { kind: 'legacy', user: { ...stored, isAdmin: false } }
      }
      if (stored?.isAdmin || profilesForUid.length > 1) {
        return {
          kind: 'denied',
          notice:
            profilesForUid.length > 1 ? ADMIN_AMBIGUOUS : ADMIN_FIREBASE_REQUIRED,
        }
      }
      return { kind: 'none' }
    }

    const profile = profilesForUid[0]
    if (profile.authUid !== firebaseUid) {
      return { kind: 'denied', notice: ADMIN_AMBIGUOUS }
    }
    return { kind: 'firebase', user: profile }
  }

  if (stored?.isAdmin) {
    return { kind: 'denied', notice: ADMIN_FIREBASE_REQUIRED }
  }
  if (stored) {
    return { kind: 'legacy', user: { ...stored, isAdmin: false } }
  }
  return { kind: 'none' }
}
