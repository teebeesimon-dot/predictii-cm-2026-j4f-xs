/**
 * Tipuri comune pentru Notification Engine.
 *
 * Acesta este fundamentul întregului sistem de notificări inteligente. Engine-ul
 * DOAR decide ce notificări trebuie trimise (produce `NotificationTask[]`);
 * trimiterea efectivă rămâne responsabilitatea serviciului Push existent.
 *
 * Totul e proiectat să fie extensibil: reguli noi se adaugă fără a modifica
 * engine-ul, iar tipurile de notificări sunt string-uri libere (nu enum rigid).
 */

// Cui i se adresează o notificare.
export type RecipientType = 'all' | 'user' | 'users'

// Prioritatea notificării (folosită ulterior la ordonare / livrare).
export type NotificationPriority = 'low' | 'normal' | 'high'

/**
 * Unitatea de bază pe care o produce o regulă și pe care o consumă (ulterior)
 * serviciul de trimitere. Nu se salvează încă nimic în Firestore.
 */
export interface NotificationTask {
  // Identificator unic al sarcinii (folosit și la deduplicare / istoric).
  id: string
  // Tipul semantic al notificării (ex. 'stage-start', 'deadline', 'standings').
  // String liber ca regulile noi să nu necesite modificarea acestui tip.
  type: string
  title: string
  body: string
  recipientType: RecipientType
  // ID-urile destinatarilor. Gol pentru recipientType === 'all'.
  recipientIds: string[]
  priority: NotificationPriority
  // Când ar trebui livrată (epoch ms). null = imediat.
  scheduledFor: number | null
  // Date suplimentare specifice regulii (ex. editionId, stageId, matchId).
  metadata: Record<string, unknown>
  createdAt: number
}

/**
 * Contextul pasat fiecărei reguli la evaluare. Momentan minim (doar `now`),
 * dar extensibil: aici vor apărea ulterior date precum ediția activă,
 * meciurile, clasamentul etc., fără a schimba semnătura `evaluate`.
 */
export interface RuleContext {
  // Momentul rulării (epoch ms). Injectat pentru a face regulile testabile.
  now: number
}

/**
 * Contractul pe care TREBUIE să-l implementeze orice regulă. Engine-ul lucrează
 * exclusiv cu această interfață, deci reguli noi pot fi adăugate fără a-l
 * modifica.
 */
export interface NotificationRule {
  // Identificator unic al regulii.
  id: string
  // Descriere scurtă (afișată în panoul de debug).
  description?: string
  // Reguli dezactivate sunt ignorate de engine.
  enabled: boolean
  // Decide ce notificări trebuie trimise. Poate fi sync sau async.
  evaluate(context: RuleContext): Promise<NotificationTask[]> | NotificationTask[]
}

// Rezultatul unei rulări a engine-ului (returnat de endpoint și afișat în UI).
export interface EngineRunResult {
  success: boolean
  // Durata rulării, în milisecunde.
  executionTime: number
  rulesExecuted: number
  // Câte notificări au produs regulile ÎNAINTE de deduplicare.
  notificationsGenerated: number
  // Câte au fost eliminate ca duplicate.
  duplicatesRemoved: number
  // Câte au fost invalidate (nu au trecut validarea).
  invalidRemoved: number
  // Lista finală, validă și deduplicată.
  notifications: NotificationTask[]
  // Erorile per-regulă (nu opresc rularea celorlalte reguli).
  errors: { ruleId: string; message: string }[]
  // Momentul rulării (epoch ms).
  ranAt: number
}
