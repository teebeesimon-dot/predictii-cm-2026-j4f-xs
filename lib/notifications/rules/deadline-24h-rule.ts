import { defineNotificationPlugin } from '@/lib/notifications/plugins/define-plugin'
import { buildDeadlineDrafts } from '@/lib/notifications/rules/_shared'
import template from '@/lib/notifications/templates/deadline-24h'

export default defineNotificationPlugin({
  id: 'deadline-24h',
  description: 'Avertizează cu 24h înainte utilizatorii cu pronosticuri incomplete.',
  enabled: true,
  template,
  evaluate: ({ data }) => buildDeadlineDrafts(data, '24h'),
})
