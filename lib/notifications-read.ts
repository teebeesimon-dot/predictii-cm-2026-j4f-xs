// Helperi PURI pentru starea de citire a notificărilor în Centrul de
// notificări (Faza 3). Derivă „citit / necitit / ascuns" din notificările
// încărcate + preferințele utilizatorului. Fără citiri Firestore.

import type { StoredNotification } from '@/lib/data'
import type { UserPreferences, NotificationCategory } from '@/lib/types'
import { isNotificationEnabled } from '@/lib/preferences'
import { categoryForNotification } from '@/lib/notifications/categories'

export interface NotificationView extends StoredNotification {
  read: boolean
  category: NotificationCategory
}

// O notificare e „citită" dacă e marcată explicit SAU dacă a fost trimisă
// înainte de reperul „marchează toate ca citite".
function isRead(n: StoredNotification, prefs: UserPreferences | undefined): boolean {
  const notif = prefs?.notifications
  if (!notif) return false
  if (notif.readKeys?.includes(n.key)) return true
  if (notif.readAllBefore && n.sentAt <= notif.readAllBefore) return true
  return false
}

// Notificările vizibile în Centru: exclude cele ascunse („șterge citite") și pe
// cele din categorii dezactivate in-app. Adaugă starea read + categoria.
export function visibleNotifications(
  notifications: StoredNotification[],
  prefs: UserPreferences | undefined,
): NotificationView[] {
  const cleared = new Set(prefs?.notifications?.clearedKeys ?? [])
  return notifications
    .filter((n) => !cleared.has(n.key))
    .filter((n) => {
      const cat = categoryForNotification(
        n.type,
        typeof n.metadata.kind === 'string'
          ? (n.metadata.kind as string)
          : undefined,
      )
      return isNotificationEnabled(prefs, 'inApp', cat)
    })
    .map((n) => ({
      ...n,
      read: isRead(n, prefs),
      category: categoryForNotification(
        n.type,
        typeof n.metadata.kind === 'string'
          ? (n.metadata.kind as string)
          : undefined,
      ),
    }))
}

// Numărul de notificări vizibile necitite.
export function unreadCount(
  notifications: StoredNotification[] | undefined,
  prefs: UserPreferences | undefined,
): number {
  if (!notifications) return 0
  return visibleNotifications(notifications, prefs).filter((n) => !n.read).length
}
