// Helperi PURI pentru preferințele utilizatorului (Faza 3).
//
// Preferințele sunt stocate pe documentul `users` (câmpul `preferences`), deci
// aceste funcții operează pe `AppUser` deja încărcat prin useUsers() — nicio
// citire Firestore suplimentară. Totul e „opt-out": o valoare absentă înseamnă
// comportamentul implicit (activat), ca să nu schimbăm comportamentul existent.

import type {
  AppUser,
  NotificationCategory,
  UserPreferences,
} from '@/lib/types'

// Cardul de rezumat de pe Acasă e vizibil? Implicit DA.
export function isResumeCardEnabled(
  prefs: UserPreferences | undefined,
): boolean {
  return prefs?.showResumeCard !== false
}

// Este activată o categorie de notificări pe un canal dat? Implicit DA.
export function isNotificationEnabled(
  prefs: UserPreferences | undefined,
  channel: 'push' | 'inApp',
  category: NotificationCategory,
): boolean {
  return prefs?.notifications?.[channel]?.[category] !== false
}

// Varianta care primește direct un AppUser (folosită în engine).
export function userWantsPush(
  user: Pick<AppUser, 'preferences'>,
  category: NotificationCategory,
): boolean {
  return isNotificationEnabled(user.preferences, 'push', category)
}

// Numele afișat: displayName dacă e setat, altfel numele complet, altfel
// username.
export function displayNameOf(
  user: Pick<AppUser, 'name' | 'username' | 'preferences'>,
): string {
  const custom = user.preferences?.displayName?.trim()
  if (custom) return custom
  return user.name || user.username
}

// Inițialele pentru avatar (max 2 litere), din numele afișat.
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
