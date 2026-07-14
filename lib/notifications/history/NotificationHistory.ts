import type { NotificationTask } from '@/lib/notifications/types'

/**
 * Istoricul notificărilor.
 *
 * Va fi folosit ulterior pentru a evita retrimiterea acelorași notificări
 * (deduplicare între rulări). Deocamdată definim DOAR interfața plus o
 * implementare in-memory temporară (nu se salvează nimic în Firestore încă).
 */
export interface NotificationHistory {
  // A fost deja procesată o sarcină cu acest id?
  has(taskId: string): Promise<boolean>
  // Marchează o sarcină ca procesată.
  record(task: NotificationTask): Promise<void>
  // Filtrează sarcinile care NU au fost încă procesate.
  filterNew(tasks: NotificationTask[]): Promise<NotificationTask[]>
}

/**
 * Implementare in-memory (placeholder). NU persistă între procese/deploy-uri.
 * Va fi înlocuită cu o variantă bazată pe Firestore într-o etapă viitoare.
 */
export class InMemoryNotificationHistory implements NotificationHistory {
  private seen = new Set<string>()

  async has(taskId: string): Promise<boolean> {
    return this.seen.has(taskId)
  }

  async record(task: NotificationTask): Promise<void> {
    this.seen.add(task.id)
  }

  async filterNew(tasks: NotificationTask[]): Promise<NotificationTask[]> {
    const out: NotificationTask[] = []
    for (const task of tasks) {
      if (!(await this.has(task.id))) out.push(task)
    }
    return out
  }
}

// Instanță partajată temporară.
export const notificationHistory: NotificationHistory =
  new InMemoryNotificationHistory()
