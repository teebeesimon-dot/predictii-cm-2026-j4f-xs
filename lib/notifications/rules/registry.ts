import type { NotificationRule } from '@/lib/notifications/types'

/**
 * Registry-ul de reguli.
 *
 * Engine-ul NU cunoaște regulile concrete — le obține de aici. Regulile se
 * înregistrează singure (vezi `rules/index.ts`), deci pentru a adăuga o regulă
 * nouă e suficient să o scrii și să o înregistrezi, fără a atinge engine-ul.
 */
const registry = new Map<string, NotificationRule>()

// Înregistrează (sau înlocuiește) o regulă după id.
export function registerRule(rule: NotificationRule): void {
  if (registry.has(rule.id)) {
    console.log(
      `[v0] notif-registry: regula "${rule.id}" era deja înregistrată, o înlocuiesc.`,
    )
  }
  registry.set(rule.id, rule)
}

// Toate regulile înregistrate (indiferent de starea `enabled`).
export function getAllRules(): NotificationRule[] {
  return Array.from(registry.values())
}

// Doar regulile active — pe acestea le execută engine-ul.
export function getActiveRules(): NotificationRule[] {
  return getAllRules().filter((r) => r.enabled)
}

// Util pentru teste: golește registry-ul.
export function clearRules(): void {
  registry.clear()
}
