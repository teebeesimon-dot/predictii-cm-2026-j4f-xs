import { defineNotificationTemplate } from '@/lib/notifications/plugins/define-plugin'

export default defineNotificationTemplate({
  id: 'stage-opened',
  title: '{{editionLabel}} — {{stageName}}',
  body: 'S-a deschis {{stageName}} ({{stageLabel}}). Intră și pune-ți pronosticurile!',
  placeholders: ['editionLabel', 'stageName', 'stageLabel'],
  priority: 'normal',
})
