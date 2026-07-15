import { defineNotificationPlugin } from '@/lib/notifications/plugins/define-plugin'
import template from '@/lib/notifications/templates/example'

/** Șablon dezactivat: demonstrează contractul minim pentru un plugin nou. */
export default defineNotificationPlugin({
  id: 'example',
  description: 'Regulă demonstrativă dezactivată implicit.',
  enabled: false,
  template,
  evaluate({ now }) {
    return [
      {
        values: {},
        id: `example-${now}`,
        notificationKey: `example|${now}`,
        recipientType: 'all',
        recipientIds: [],
        metadata: { source: 'example-template' },
        createdAt: now,
      },
    ]
  },
})
