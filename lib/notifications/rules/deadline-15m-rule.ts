import { defineNotificationPlugin } from '@/lib/notifications/plugins/define-plugin'
import { buildDeadlineDrafts } from '@/lib/notifications/rules/_shared'
import template from '@/lib/notifications/templates/deadline-15m'

export default defineNotificationPlugin({
  id: 'deadline-15m',
  description: 'Avertizează cu 15m înainte utilizatorii cu pronosticuri incomplete.',
  enabled: true,
  template,
  evaluate: ({ data }) => buildDeadlineDrafts(data, '15m'),
})
