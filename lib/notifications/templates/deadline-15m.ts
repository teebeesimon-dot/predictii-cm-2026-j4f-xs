import { defineNotificationTemplate } from '@/lib/notifications/plugins/define-plugin'

export default defineNotificationTemplate({
  id: 'deadline-15m',
  title: '{{editionLabel}} — pronosticuri',
  body: 'Mai ai 15 minute până la închiderea etapei „{{stageName}}”. Încă nu ai completat toate pronosticurile!',
  placeholders: ['editionLabel', 'stageName'],
  priority: 'high',
})
