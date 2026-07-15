import { defineNotificationTemplate } from '@/lib/notifications/plugins/define-plugin'

export default defineNotificationTemplate({
  id: 'example',
  title: 'Notificare exemplu',
  body: 'Aceasta este o notificare generată de regula-șablon.',
  placeholders: [],
  priority: 'low',
})
