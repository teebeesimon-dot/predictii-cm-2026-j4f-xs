import { defineNotificationPlugin } from '@/lib/notifications/plugins/define-plugin'
import { participants, stageDeadlineMs } from '@/lib/notifications/rules/_shared'
import template from '@/lib/notifications/templates/stage-closed'

const CLOSE_GRACE_MS = 6 * 3600_000

export default defineNotificationPlugin({
  id: 'stage-closed',
  description: 'Anunță participanții că pronosticurile etapei s-au închis.',
  enabled: true,
  template,
  evaluate({ now, data }) {
    const drafts = []

    for (const edition of data.editions) {
      for (const stage of edition.stages) {
        const deadline = stageDeadlineMs(edition.scheduler, stage.id)
        if (
          deadline === null ||
          now < deadline ||
          now >= deadline + CLOSE_GRACE_MS
        ) {
          continue
        }
        if (data.matchesForStage(edition.editionId, stage.id).length === 0) {
          continue
        }

        const recipients = participants(data, edition.editionId)
        if (recipients.length === 0) continue

        drafts.push({
          values: {
            editionLabel: edition.label,
            stageName: stage.name,
          },
          id: `stage-closed-${edition.editionId}-${stage.id}-${deadline}`,
          notificationKey: `stage-closed|${edition.editionId}|${stage.id}|${deadline}`,
          recipientType: 'users' as const,
          recipientIds: recipients.map((user) => user.id),
          metadata: {
            kind: 'stage-closed',
            editionId: edition.editionId,
            competitionId: edition.competitionId,
            stage: stage.id,
            deadline: new Date(deadline).toISOString(),
          },
          createdAt: now,
        })
      }
    }

    return drafts
  },
})
