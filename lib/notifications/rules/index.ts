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
import { stageOpenedRule } from '@/lib/notifications/rules/stage-opened-rule'
import { stageClosedRule } from '@/lib/notifications/rules/stage-closed-rule'
import {
  deadline24hRule,
  deadline3hRule,
  deadline1hRule,
  deadline15mRule,
} from '@/lib/notifications/rules/deadline-rules'

let registered = false

// Înregistrează regulile o singură dată (idempotent la re-import în dev/HMR).
export function ensureRulesRegistered(): void {
  if (registered) return
  registered = true

  // Regula-șablon rămâne dezactivată (doar referință de structură).
  registerRule(exampleRule)

  // Reguli inteligente pentru pronosticuri (generice pe orice competiție/ediție).
  registerRule(stageOpenedRule)
  registerRule(deadline24hRule)
  registerRule(deadline3hRule)
  registerRule(deadline1hRule)
  registerRule(deadline15mRule)
  registerRule(stageClosedRule)
}
