import type { CompetitionId } from '@/lib/editions'
import type { Match, AppUser, Prediction } from '@/lib/types'
import type { StageDef } from '@/lib/stages'
import type { Scheduler } from '@/lib/schedule'

/**
 * Datele partajate injectate în fiecare regulă prin `RuleContext.data`.
 *
 * Sunt încărcate O SINGURĂ DATĂ per rulare a engine-ului (3 citiri de colecție:
 * matches, users, predictions) și refolosite de toate regulile. Astfel numărul
 * de citiri Firestore NU crește cu numărul de reguli sau de ediții.
 *
 * Totul este GENERIC: nicio referință la o competiție anume. Fiecare ediție
 * vine cu propriul `scheduler` (lib/schedule) care respectă programul și
 * termenele deja existente în aplicație (World Cup termene fixe; Champions
 * League / Euro termene calculate din program).
 */

// Snapshot pentru o singură ediție (competiție + an) care are meciuri.
export interface EditionSnapshot {
  editionId: string
  competitionId: CompetitionId
  label: string
  matches: Match[]
  stages: StageDef[]
  scheduler: Scheduler
}

export interface EngineData {
  now: number
  // Toți utilizatorii (regulile filtrează per acces la ediție).
  users: AppUser[]
  // Câte o intrare pentru fiecare ediție care are cel puțin un meci.
  editions: EditionSnapshot[]
  // Are utilizatorul un pronostic salvat pentru meciul dat?
  hasPrediction(userId: string, matchId: string): boolean
  // Meciurile unei etape dintr-o ediție.
  matchesForStage(editionId: string, stage: number): Match[]
  // Lista completă de pronosticuri (opțional; încărcată doar când e nevoie de
  // calculul achievement-urilor). Regulile care au nevoie de ea citesc câmpul
  // `_predictions`; dacă e gol, sar calculul și nu produc notificări.
  _predictions?: Prediction[]
}
