import 'server-only'
import type { NotificationTask } from '@/lib/notifications/types'
import {
  sendToAll,
  sendToUser,
  sendToMany,
  sendToKnownUsers,
  type PushResult,
} from '@/lib/push/sendPushNotification'
import type { AppUser } from '@/lib/types'
import { categoryForNotification } from '@/lib/notifications/categories'
import { isNotificationEnabled } from '@/lib/preferences'

/**
 * Adaptor între o `NotificationTask` și serviciul Push EXISTENT.
 *
 * IMPORTANT:
 *   - Reutilizează `lib/push/sendPushNotification` fără a-l modifica.
 *   - Engine-ul NU apelează acest serviciu — el doar decide ce trebuie trimis.
 *     Trimiterea efectivă va fi cablată într-o etapă viitoare (ex. un cron care
 *     rulează engine-ul și apoi predă sarcinile aici).
 */
export class PushService {
  // Trimite o singură sarcină folosind serviciul Push existent.
  async dispatch(
    task: NotificationTask,
    knownUsers?: AppUser[],
  ): Promise<PushResult> {
    const payload = {
      title: task.title,
      body: task.body,
      data: normalizeMetadata(task.metadata),
    }

    // Categoria notificării (dedusă din tip/metadata) → respectăm preferințele
    // push per-utilizator. Filtrarea se face aici, în adaptor, folosind userii
    // deja încărcați de engine, deci NU adaugă citiri Firestore. Absența unei
    // preferințe înseamnă „activat" (opt-out), deci comportamentul implicit
    // rămâne neschimbat față de înainte.
    const category = categoryForNotification(
      task.type,
      typeof task.metadata.kind === 'string' ? task.metadata.kind : undefined,
    )
    const pushAllowed = (user: AppUser | undefined): boolean =>
      user ? isNotificationEnabled(user.preferences, 'push', category) : true

    const knownById = knownUsers
      ? new Map(knownUsers.map((user) => [user.id, user]))
      : null

    switch (task.recipientType) {
      case 'all': {
        if (knownUsers) {
          return sendToKnownUsers(knownUsers.filter(pushAllowed), payload)
        }
        // Fără useri cunoscuți (ex. broadcast manual): trimitem tuturor.
        // Filtrarea per-preferință necesită userii, care nu sunt disponibili
        // aici fără o citire suplimentară; păstrăm comportamentul existent.
        return sendToAll(payload)
      }
      case 'user': {
        const known = knownById?.get(task.recipientIds[0])
        if (known) {
          return pushAllowed(known)
            ? sendToKnownUsers([known], payload)
            : { sent: 0, failed: 0, invalidTokensRemoved: 0 }
        }
        return sendToUser(task.recipientIds[0], payload)
      }
      case 'users': {
        if (knownById) {
          const recipients = task.recipientIds
            .map((id) => knownById.get(id))
            .filter((user): user is AppUser => Boolean(user))
            .filter(pushAllowed)
          return sendToKnownUsers(recipients, payload)
        }
        const results = await Promise.all(
          task.recipientIds.map((id) => sendToUser(id, payload)),
        )
        return results.reduce<PushResult>(
          (acc, r) => ({
            sent: acc.sent + r.sent,
            failed: acc.failed + r.failed,
            invalidTokensRemoved:
              acc.invalidTokensRemoved + r.invalidTokensRemoved,
          }),
          { sent: 0, failed: 0, invalidTokensRemoved: 0 },
        )
      }
      default:
        return { sent: 0, failed: 0, invalidTokensRemoved: 0 }
    }
  }

  // Trimite mai multe sarcini secvențial.
  async dispatchMany(tasks: NotificationTask[]): Promise<PushResult> {
    const total: PushResult = { sent: 0, failed: 0, invalidTokensRemoved: 0 }
    for (const task of tasks) {
      const r = await this.dispatch(task)
      total.sent += r.sent
      total.failed += r.failed
      total.invalidTokensRemoved += r.invalidTokensRemoved
    }
    return total
  }

  // Expune trimiterea către token-uri brute (delegă la serviciul existent).
  async dispatchToTokens(
    tokens: string[],
    title: string,
    body: string,
  ): Promise<PushResult> {
    return sendToMany(tokens, { title, body })
  }
}

// FCM `data` acceptă doar string-uri; convertim metadata la Record<string,string>.
function normalizeMetadata(
  metadata: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(metadata)) {
    if (value === null || value === undefined) continue
    out[key] = typeof value === 'string' ? value : JSON.stringify(value)
  }
  return out
}

export const pushService = new PushService()
