import type {
  NotificationRule,
  NotificationTask,
  RuleContext,
} from '@/lib/notifications/types'
import { participants, stageDeadlineMs } from '@/lib/notifications/rules/_shared'
import { createTemplatedNotificationTask } from '@/lib/notifications/templates'

// Cât timp după deschiderea unei etape mai are voie să se declanșeze
// notificarea (ca o etapă deschisă demult să nu se anunțe cu întârziere).
const OPEN_GRACE_MS = 6 * 3600_000 // 6 ore

/**
 * StageOpenedRule — anunță toți participanții când se DESCHIDE o etapă nouă.
 *
 * Generic pentru orice competiție: o etapă „se deschide" în momentul în care
 * etapa precedentă se închide (termenul ei limită). Prima etapă nu are
 * predecesor, deci nu produce un anunț de deschidere (evită spam la prima
 * rulare / deploy). Se folosesc exclusiv termenele din scheduler-ul ediției.
 */
export const stageOpenedRule: NotificationRule = {
  id: 'stage-opened',
  description:
    'Anunță participanții când se deschide o etapă nouă (la închiderea celei precedente).',
  enabled: true,
  evaluate(context: RuleContext): NotificationTask[] {
    const { now, data } = context
    const tasks: NotificationTask[] = []

    for (const edition of data.editions) {
      const stages = edition.stages
      for (let i = 1; i < stages.length; i++) {
        const stage = stages[i]
        const prev = stages[i - 1]

        // Etapa se deschide când se închide cea precedentă.
        const openAt = stageDeadlineMs(edition.scheduler, prev.id)
        if (openAt === null) continue
        if (!(now >= openAt && now < openAt + OPEN_GRACE_MS)) continue

        // Dacă etapa curentă e deja închisă, nu mai anunțăm deschiderea.
        const thisDeadline = stageDeadlineMs(edition.scheduler, stage.id)
        if (thisDeadline !== null && now >= thisDeadline) continue

        // Trebuie să existe meciuri în etapă.
        if (data.matchesForStage(edition.editionId, stage.id).length === 0) {
          continue
        }

        const recipients = participants(data, edition.editionId)
        if (recipients.length === 0) continue

        tasks.push(
          createTemplatedNotificationTask({
            templateId: 'stage-opened',
            values: {
              editionLabel: edition.label,
              stageName: stage.name,
              stageLabel: stage.label,
            },
            id: `stage-opened-${edition.editionId}-${stage.id}`,
            notificationKey: `stage-opened|${edition.editionId}|${stage.id}`,
            recipientType: 'users',
            recipientIds: recipients.map((u) => u.id),
            metadata: {
              kind: 'stage-opened',
              editionId: edition.editionId,
              competitionId: edition.competitionId,
              stage: stage.id,
            },
            createdAt: now,
          }),
        )
      }
    }

    return tasks
  },
}
