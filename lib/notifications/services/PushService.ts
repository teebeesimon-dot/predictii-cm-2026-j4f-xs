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

    const knownById = knownUsers
      ? new Map(knownUsers.map((user) => [user.id, user]))
      : null

    switch (task.recipientType) {
      case 'all':
        return knownUsers ? sendToKnownUsers(knownUsers, payload) : sendToAll(payload)
      case 'user': {
        const known = knownById?.get(task.recipientIds[0])
        return known
          ? sendToKnownUsers([known], payload)
          : sendToUser(task.recipientIds[0], payload)
      }
      case 'users': {
        if (knownById) {
          const recipients = task.recipientIds
            .map((id) => knownById.get(id))
            .filter((user): user is AppUser => Boolean(user))
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
