import type {
  EngineRunResult,
  NotificationTask,
  RuleContext,
} from '@/lib/notifications/types'
import { getActiveRules } from '@/lib/notifications/rules/registry'
import { ensureRulesRegistered } from '@/lib/notifications/rules'
import { NotificationLogger } from '@/lib/notifications/logger/NotificationLogger'

/**
 * NotificationEngine — decide CE notificări trebuie trimise.
 *
 * Pași:
 *   1. încarcă toate regulile active (din registry)
 *   2. execută fiecare regulă (izolat — o eroare într-o regulă nu le oprește pe
 *      celelalte)
 *   3. colectează notificările generate
 *   4. elimină duplicatele
 *   5. validează notificările
 *   6. întoarce lista finală + metrici
 *
 * Engine-ul NU trimite notificări. Trimiterea este responsabilitatea
 * serviciului Push (vezi `services/PushService`).
 */
export class NotificationEngine {
  // Cheie de deduplicare: două sarcini cu aceeași cheie sunt considerate egale.
  private dedupeKey(t: NotificationTask): string {
    const recipients = [...t.recipientIds].sort().join(',')
    return `${t.type}|${t.recipientType}|${recipients}|${t.title}|${t.body}`
  }

  // O sarcină e validă dacă are conținut și destinatari coerenți.
  private isValid(t: NotificationTask): boolean {
    if (!t.id || !t.type) return false
    if (!t.title.trim() || !t.body.trim()) return false
    if (!['all', 'user', 'users'].includes(t.recipientType)) return false
    if (t.recipientType !== 'all' && t.recipientIds.length === 0) return false
    return true
  }

  async run(now: number = Date.now()): Promise<EngineRunResult> {
    const logger = new NotificationLogger()
    logger.start()

    // Asigură-te că regulile s-au înregistrat în registry.
    ensureRulesRegistered()

    const rules = getActiveRules()
    const context: RuleContext = { now }
    const errors: { ruleId: string; message: string }[] = []
    const generated: NotificationTask[] = []

    // 1-3: execută fiecare regulă izolat și colectează rezultatele.
    for (const rule of rules) {
      try {
        const tasks = await rule.evaluate(context)
        generated.push(...tasks)
      } catch (e) {
        const message = (e as Error).message
        errors.push({ ruleId: rule.id, message })
        console.log(`[v0] notif-engine: regula "${rule.id}" a eșuat: ${message}`)
      }
    }

    // 4: deduplicare (păstrează prima apariție a fiecărei chei).
    const seen = new Set<string>()
    const deduped: NotificationTask[] = []
    for (const task of generated) {
      const key = this.dedupeKey(task)
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(task)
    }
    const duplicatesRemoved = generated.length - deduped.length

    // 5: validare.
    const valid = deduped.filter((t) => this.isValid(t))
    const invalidRemoved = deduped.length - valid.length

    // Metrici + log.
    logger.set('rules', rules.length)
    logger.set('notifications', generated.length)
    logger.set('duplicates', duplicatesRemoved)
    logger.set('invalid', invalidRemoved)
    logger.set('sent', 0) // engine-ul nu trimite
    logger.set('ignored', invalidRemoved)
    const metrics = logger.finish()
    logger.summary()

    return {
      success: errors.length === 0,
      executionTime: metrics.durationMs,
      rulesExecuted: rules.length,
      notificationsGenerated: generated.length,
      duplicatesRemoved,
      invalidRemoved,
      notifications: valid,
      errors,
      ranAt: now,
    }
  }
}

// Instanță partajată (engine-ul e stateless între rulări).
export const notificationEngine = new NotificationEngine()
