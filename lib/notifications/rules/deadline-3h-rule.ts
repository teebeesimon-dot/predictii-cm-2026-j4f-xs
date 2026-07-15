import { defineNotificationPlugin } from '@/lib/notifications/plugins/define-plugin'
import { buildDeadlineDrafts } from '@/lib/notifications/rules/_shared'
import template from '@/lib/notifications/templates/deadline-3h'

export default defineNotificationPlugin({
  id: 'deadline-3h',
  description: 'Avertizează cu 3h înainte utilizatorii cu pronosticuri incomplete.',
  enabled: true,
  template,
  evaluate: ({ data }) => buildDeadlineDrafts(data, '3h'),
})
