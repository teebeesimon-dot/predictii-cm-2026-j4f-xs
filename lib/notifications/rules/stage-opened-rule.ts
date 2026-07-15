import { defineNotificationPlugin } from '@/lib/notifications/plugins/define-plugin'
import { participants, stageDeadlineMs } from '@/lib/notifications/rules/_shared'
import template from '@/lib/notifications/templates/stage-opened'

const OPEN_GRACE_MS = 6 * 3600_000

export default defineNotificationPlugin({
  id: 'stage-opened',
  description:
    'Anunță participanții când se deschide o etapă nouă (la închiderea celei precedente).',
  enabled: true,
  template,
  evaluate({ now, data }) {
    const drafts = []

    for (const edition of data.editions) {
      for (let index = 1; index < edition.stages.length; index++) {
        const stage = edition.stages[index]
        const previousStage = edition.stages[index - 1]
        const openAt = stageDeadlineMs(edition.scheduler, previousStage.id)
        if (openAt === null || now < openAt || now >= openAt + OPEN_GRACE_MS) {
          continue
        }

        const deadline = stageDeadlineMs(edition.scheduler, stage.id)
        if (deadline !== null && now >= deadline) continue
        if (data.matchesForStage(edition.editionId, stage.id).length === 0) {
          continue
        }

        const recipients = participants(data, edition.editionId)
        if (recipients.length === 0) continue

        drafts.push({
          values: {
            editionLabel: edition.label,
            stageName: stage.name,
            stageLabel: stage.label,
          },
          id: `stage-opened-${edition.editionId}-${stage.id}`,
          notificationKey: `stage-opened|${edition.editionId}|${stage.id}`,
          recipientType: 'users' as const,
          recipientIds: recipients.map((user) => user.id),
          metadata: {
            kind: 'stage-opened',
            editionId: edition.editionId,
            competitionId: edition.competitionId,
            stage: stage.id,
          },
          createdAt: now,
        })
      }
    }

    return drafts
  },
})
