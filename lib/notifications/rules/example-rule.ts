import type {
  NotificationRule,
  NotificationTask,
  RuleContext,
} from '@/lib/notifications/types'
import { createTemplatedNotificationTask } from '@/lib/notifications/templates'

/**
 * REGULĂ-ȘABLON (dezactivată implicit).
 *
 * Nu conține logică reală (fără deadline / clasament / goluri / meciuri — acestea
 * vin în etapele următoare). Servește DOAR ca exemplu de structură pentru a
 * arăta cum se scrie și se înregistrează o regulă nouă.
 *
 * Ca să o activezi temporar în teste, pune `enabled: true`.
 */
export const exampleRule: NotificationRule = {
  id: 'example-template',
  description: 'Regulă-șablon de demonstrație (nu produce nimic real).',
  enabled: false,

  evaluate(context: RuleContext): NotificationTask[] {
    // O regulă reală ar inspecta contextul și ar întoarce sarcini. Aici întoarcem
    // un exemplu doar ca referință de formă.
    const task: NotificationTask = createTemplatedNotificationTask({
      templateId: 'example',
      values: {},
      id: `example-${context.now}`,
      notificationKey: `example|${context.now}`,
      recipientType: 'all',
      recipientIds: [],
      metadata: { source: 'example-template' },
      createdAt: context.now,
    })
    return [task]
  },
}
