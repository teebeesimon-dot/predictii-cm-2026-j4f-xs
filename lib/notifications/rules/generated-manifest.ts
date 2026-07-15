// AUTO-GENERAT de scripts/generate-notification-manifest.mjs.
// Nu edita manual. Adaugă un fișier *-rule.ts și template-ul său pereche.
import plugin0 from '@/lib/notifications/rules/deadline-15m-rule'
import plugin1 from '@/lib/notifications/rules/deadline-1h-rule'
import plugin2 from '@/lib/notifications/rules/deadline-24h-rule'
import plugin3 from '@/lib/notifications/rules/deadline-3h-rule'
import plugin4 from '@/lib/notifications/rules/example-rule'
import plugin5 from '@/lib/notifications/rules/stage-closed-rule'
import plugin6 from '@/lib/notifications/rules/stage-opened-rule'

export const notificationPlugins = [
  plugin0,
  plugin1,
  plugin2,
  plugin3,
  plugin4,
  plugin5,
  plugin6,
] as const
