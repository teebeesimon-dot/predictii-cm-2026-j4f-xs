import type {
  NotificationRule,
  NotificationTask,
  RuleContext,
} from '@/lib/notifications/types'
import { buildDeadlineTasks } from '@/lib/notifications/rules/_shared'

/**
 * Reguli de reamintire a termenului limită de pronostic.
 *
 * Toate patru au ACEEAȘI logică (delegată la `buildDeadlineTasks`) și diferă
 * doar prin cât de aproape de termen se declanșează: 24h, 3h, 1h, 15m.
 *
 * Trimit DOAR utilizatorilor care nu și-au completat toate pronosticurile
 * etapei. Sunt complet generice: iterează toate edițiile cu meciuri și
 * folosesc termenul fiecărei etape din scheduler-ul ediției (programul și
 * timerele deja existente).
 */

export const deadline24hRule: NotificationRule = {
  id: 'deadline-24h',
  description:
    'Reamintire cu 24h înainte de termen — doar celor cu pronosticuri incomplete.',
  enabled: true,
  evaluate(context: RuleContext): NotificationTask[] {
    return buildDeadlineTasks(context.data, '24h')
  },
}

export const deadline3hRule: NotificationRule = {
  id: 'deadline-3h',
  description:
    'Reamintire cu 3h înainte de termen — doar celor cu pronosticuri incomplete.',
  enabled: true,
  evaluate(context: RuleContext): NotificationTask[] {
    return buildDeadlineTasks(context.data, '3h')
  },
}

export const deadline1hRule: NotificationRule = {
  id: 'deadline-1h',
  description:
    'Reamintire cu 1h înainte de termen — doar celor cu pronosticuri incomplete.',
  enabled: true,
  evaluate(context: RuleContext): NotificationTask[] {
    return buildDeadlineTasks(context.data, '1h')
  },
}

export const deadline15mRule: NotificationRule = {
  id: 'deadline-15m',
  description:
    'Reamintire cu 15m înainte de termen — doar celor cu pronosticuri incomplete.',
  enabled: true,
  evaluate(context: RuleContext): NotificationTask[] {
    return buildDeadlineTasks(context.data, '15m')
  },
}
