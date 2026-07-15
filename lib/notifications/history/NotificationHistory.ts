import 'server-only'
import type { NotificationTask } from '@/lib/notifications/types'
import { computeNotificationKey } from '@/lib/notifications/types'
import { adminDb } from '@/lib/firebase-admin'

/**
 * Istoricul notificărilor — sursa de adevăr pentru „ce s-a trimis deja".
 *
 * Engine-ul îl folosește ca să NU retrimită o notificare identică între rulări.
 * Cheia de identitate este `notificationKey` (unic + determinist, vezi
 * `computeNotificationKey`), care devine ID de document în colecția
 * `notification_history`.
 */
export interface NotificationHistory {
  // A fost deja trimisă o notificare cu această cheie?
  has(key: string): Promise<boolean>
  // Marchează o notificare drept trimisă (persistă în istoric).
  record(task: NotificationTask): Promise<void>
  recordMany(tasks: NotificationTask[]): Promise<void>
  // Din lista dată, întoarce DOAR notificările care nu au fost încă trimise.
  filterNew(tasks: NotificationTask[]): Promise<NotificationTask[]>
}

// Numele colecției Firestore care ține istoricul.
const COLLECTION = 'notification_history'

// Garantează că fiecare sarcină are o cheie deterministă.
export function keyOf(task: NotificationTask): string {
  return task.notificationKey ?? computeNotificationKey(task)
}

/**
 * Implementare bazată pe Firestore (via Firebase Admin SDK). Persistă între
 * rulări și deploy-uri. ID-ul documentului = `notificationKey`, deci scrierea
 * este idempotentă și existența se verifică printr-un simplu `get`.
 */
export class FirestoreNotificationHistory implements NotificationHistory {
  async has(key: string): Promise<boolean> {
    const snap = await adminDb().collection(COLLECTION).doc(key).get()
    return snap.exists
  }

  async record(task: NotificationTask): Promise<void> {
    const key = keyOf(task)
    await adminDb()
      .collection(COLLECTION)
      .doc(key)
      .set(
        {
          notificationKey: key,
          type: task.type,
          title: task.title,
          body: task.body,
          recipientType: task.recipientType,
          recipientIds: task.recipientIds,
          metadata: task.metadata ?? {},
          sentAt: Date.now(),
        },
        { merge: true },
      )
  }

  async recordMany(tasks: NotificationTask[]): Promise<void> {
    if (tasks.length === 0) return
    const db = adminDb()
    const batch = db.batch()
    const sentAt = Date.now()
    for (const task of tasks) {
      const key = keyOf(task)
      batch.set(
        db.collection(COLLECTION).doc(key),
        {
          notificationKey: key,
          type: task.type,
          title: task.title,
          body: task.body,
          recipientType: task.recipientType,
          recipientIds: task.recipientIds,
          metadata: task.metadata ?? {},
          sentAt,
        },
        { merge: true },
      )
    }
    await batch.commit()
  }

  async filterNew(tasks: NotificationTask[]): Promise<NotificationTask[]> {
    if (tasks.length === 0) return []
    // getAll păstrează aceleași citiri facturate, dar le face într-un singur RPC
    // în loc de câte un request HTTP per notificare.
    const db = adminDb()
    const refs = tasks.map((task) =>
      db.collection(COLLECTION).doc(keyOf(task)),
    )
    const snaps = await db.getAll(...refs)
    return tasks.filter((_, index) => !snaps[index].exists)
  }
}

// Instanță partajată folosită de engine.
export const notificationHistory: NotificationHistory =
  new FirestoreNotificationHistory()
