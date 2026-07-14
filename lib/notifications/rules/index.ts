/**
 * Punctul de auto-înregistrare a regulilor.
 *
 * Importând acest modul, toate regulile se înscriu în registry. Engine-ul
 * importă acest fișier o singură dată înainte de a citi regulile active.
 *
 * PENTRU A ADĂUGA O REGULĂ NOUĂ:
 *   1. Creează un fișier în `lib/notifications/rules/` care exportă un obiect
 *      ce implementează `NotificationRule`.
 *   2. Importă-l aici și apelează `registerRule(...)`.
 * Engine-ul nu trebuie modificat.
 */
import { registerRule } from '@/lib/notifications/rules/registry'
import { exampleRule } from '@/lib/notifications/rules/example-rule'

let registered = false

// Înregistrează regulile o singură dată (idempotent la re-import în dev/HMR).
export function ensureRulesRegistered(): void {
  if (registered) return
  registered = true

  registerRule(exampleRule)
  // registerRule(stageStartRule)   // <- reguli viitoare
  // registerRule(deadlineRule)
  // registerRule(standingsRule)
}
