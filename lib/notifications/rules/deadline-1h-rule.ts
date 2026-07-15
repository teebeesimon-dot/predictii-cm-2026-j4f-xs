import { defineNotificationPlugin } from '@/lib/notifications/plugins/define-plugin'
import { buildDeadlineDrafts } from '@/lib/notifications/rules/_shared'
import template from '@/lib/notifications/templates/deadline-1h'

export default defineNotificationPlugin({
  id: 'deadline-1h',
  description: 'Avertizează cu 1h înainte utilizatorii cu pronosticuri incomplete.',
  enabled: true,
  template,
  evaluate: ({ data }) => buildDeadlineDrafts(data, '1h'),
})
