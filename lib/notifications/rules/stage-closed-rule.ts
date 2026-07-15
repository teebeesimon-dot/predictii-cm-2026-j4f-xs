import type {
  NotificationRule,
  NotificationTask,
  RuleContext,
} from '@/lib/notifications/types'
import { participants, stageDeadlineMs } from '@/lib/notifications/rules/_shared'
import { createTemplatedNotificationTask } from '@/lib/notifications/templates'

// Cât timp după închiderea etapei mai are voie să se declanșeze notificarea.
const CLOSE_GRACE_MS = 6 * 3600_000 // 6 ore

/**
 * StageClosedRule — anunță participanții că pronosticurile unei etape s-au
 * ÎNCHIS (termenul limită a trecut).
 *
 * Generic: folosește termenul fiecărei etape din scheduler-ul ediției. Cheia
 * include termenul, deci la competițiile unde o „etapă" are mai multe termene
 * (ex. faza eliminatorie World Cup, cu runde separate) se anunță închiderea
 * fiecărei runde.
 */
export const stageClosedRule: NotificationRule = {
  id: 'stage-closed',
  description: 'Anunță participanții că pronosticurile etapei s-au închis.',
  enabled: true,
  evaluate(context: RuleContext): NotificationTask[] {
    const { now, data } = context
    const tasks: NotificationTask[] = []

    for (const edition of data.editions) {
      for (const stage of edition.stages) {
        const deadline = stageDeadlineMs(edition.scheduler, stage.id)
        if (deadline === null) continue
        // Chiar după închidere, într-o fereastră scurtă.
        if (!(now >= deadline && now < deadline + CLOSE_GRACE_MS)) continue

        if (data.matchesForStage(edition.editionId, stage.id).length === 0) {
          continue
        }

        const recipients = participants(data, edition.editionId)
        if (recipients.length === 0) continue

        tasks.push(
          createTemplatedNotificationTask({
            templateId: 'stage-closed',
            values: {
              editionLabel: edition.label,
              stageName: stage.name,
            },
            id: `stage-closed-${edition.editionId}-${stage.id}-${deadline}`,
            notificationKey: `stage-closed|${edition.editionId}|${stage.id}|${deadline}`,
            recipientType: 'users',
            recipientIds: recipients.map((u) => u.id),
            metadata: {
              kind: 'stage-closed',
              editionId: edition.editionId,
              competitionId: edition.competitionId,
              stage: stage.id,
              deadline: new Date(deadline).toISOString(),
            },
            createdAt: now,
          }),
        )
      }
    }

    return tasks
  },
}
