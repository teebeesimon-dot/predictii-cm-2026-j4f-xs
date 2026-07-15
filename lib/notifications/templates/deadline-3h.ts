import { defineNotificationTemplate } from '@/lib/notifications/plugins/define-plugin'

export default defineNotificationTemplate({
  id: 'deadline-3h',
  title: '{{editionLabel}} — pronosticuri',
  body: 'Mai ai 3 ore până la închiderea etapei „{{stageName}}”. Încă nu ai completat toate pronosticurile!',
  placeholders: ['editionLabel', 'stageName'],
  priority: 'high',
})
