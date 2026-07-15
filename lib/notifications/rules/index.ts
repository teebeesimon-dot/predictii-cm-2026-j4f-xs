import { pluginAsRule } from '@/lib/notifications/plugins/define-plugin'
import { notificationPlugins } from '@/lib/notifications/rules/generated-manifest'
import { registerRule } from '@/lib/notifications/rules/registry'

let registered = false

/** Înregistrează automat fiecare plugin descoperit de manifestul generat. */
export function ensureRulesRegistered(): void {
  if (registered) return
  for (const plugin of notificationPlugins) {
    registerRule(pluginAsRule(plugin))
  }
  registered = true
}
