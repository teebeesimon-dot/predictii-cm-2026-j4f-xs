/**
 * Regulă: notifică un utilizator când deblochează un achievement nou.
 *
 * Engine-ul detectează achievement-urile deblocate comparând starea calculată
 * cu ce e stocat pe `users.achievements.unlocked`. Cheia notificării include
 * userId + achievement id, deci `notification_history` garantează că
 * aceeași deblocare nu se retrimite niciodată.
 *
 * Această regulă funcționează pe ORICE competiție/ediție — nu conține nicio
 * ramură hardcodată. Un achievement nou necesită DOAR o intrare în
 * `lib/achievements/definitions.ts`.
 */

import { defineNotificationPlugin } from '@/lib/notifications/plugins/define-plugin'
import { participants } from '@/lib/notifications/rules/_shared'
import {
  computeAchievements,
  findNewlyUnlocked,
} from '@/lib/achievements/compute'
import type { StoredAchievements } from '@/lib/achievements/types'
import { ACHIEVEMENT_MAP } from '@/lib/achievements/definitions'
import template from '@/lib/notifications/templates/achievement-unlocked'

export default defineNotificationPlugin({
  id: 'achievement-unlocked',
  description:
    'Notifică utilizatorul când deblochează un achievement nou. ' +
    'Funcționează pe orice competiție/ediție fără modificări.',
  enabled: true,
  template,

  evaluate({ now, data }) {
    const drafts = []

    // Luăm toți utilizatorii din prima ediție disponibilă (sau din toate):
    // achievement-urile sunt globale (nu per ediție), deci nu iterăm per
    // ediție. Utilizăm `data.users` direct și filtram manual viewOnly/admin.
    const allUsers = data.users.filter((u) => {
      if (u.viewOnly) return false
      if (
        u.username === 'admin' ||
        (u.name ?? '').toLowerCase() === 'administrator'
      )
        return false
      return true
    })

    // Colectăm toate meciurile și pronosticurile de pe toate edițiile.
    const allMatches = data.editions.flatMap((e) => e.matches)
    // `data` nu expune toate pronosticurile direct; le reconstruim din hasPrediction
    // ar fi prea costisitor. În schimb folosim EngineDataSource care le are în
    // memorie. Le accesăm prin câmpul intern `_predictions` dacă există, altfel
    // ne oprim — plugin-ul e sigur de adăugat fără EngineDataSource modificat.
    const allPredictions =
      (data as any)._predictions ?? []

    if (allPredictions.length === 0) {
      // Date insuficiente — nu putem calcula achievements (normal la primul run).
      return []
    }

    for (const user of allUsers) {
      const stored: StoredAchievements = (user as any).achievements ?? {
        unlocked: {},
      }
      const states = computeAchievements(
        user,
        allUsers,
        allMatches,
        allPredictions,
      )
      const newlyUnlocked = findNewlyUnlocked(states, stored)

      for (const s of newlyUnlocked) {
        // Trimitem notificare doar pentru achievement-urile care au
        // `notificationCategory` setat (opt-in la nivel de definiție).
        if (!s.def.notificationCategory) continue

        drafts.push({
          values: {
            achievementTitle: s.def.title,
            achievementDescription: s.def.description,
          },
          id: `achievement-unlocked-${user.id}-${s.def.id}-${now}`,
          // Cheia stabilă: userId + achievementId → trimis o singură dată.
          notificationKey: `achievement-unlocked|${user.id}|${s.def.id}`,
          recipientType: 'user' as const,
          recipientIds: [user.id],
          metadata: {
            kind: 'achievement',
            achievementId: s.def.id,
            userId: user.id,
          },
          createdAt: now,
        })
      }
    }

    return drafts
  },
})
