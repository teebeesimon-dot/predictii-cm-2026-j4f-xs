import type {
  EngineRunMode,
  EngineRunResult,
  NotificationTask,
  RuleContext,
} from '@/lib/notifications/types'
import { computeNotificationKey } from '@/lib/notifications/types'
import { getActiveRules } from '@/lib/notifications/rules/registry'
import { ensureRulesRegistered } from '@/lib/notifications/rules'
import { NotificationLogger } from '@/lib/notifications/logger/NotificationLogger'
import {
  notificationHistory,
  keyOf,
} from '@/lib/notifications/history/NotificationHistory'
import { pushService } from '@/lib/notifications/services/PushService'

/**
 * NotificationEngine — decide CE notificări trebuie trimise.
 *
 * Pași:
 *   1. încarcă toate regulile active (din registry)
 *   2. execută fiecare regulă izolat (o eroare într-o regulă nu le oprește pe
 *      celelalte)
 *   3. colectează notificările generate și le atribuie o cheie deterministă
 *   4. elimină duplicatele DIN ACEEAȘI rulare
 *   5. validează notificările
 *   6. elimină notificările deja trimise (din `notification_history`)
 *   7. în funcție de mod:
 *        - 'dry-run': DOAR întoarce lista (nu trimite, nu salvează)
 *        - 'live':    trimite prin serviciul Push și salvează în istoric
 *
 * În modul 'dry-run' engine-ul NU are niciun efect secundar.
 */
export class NotificationEngine {
  // Cheie de deduplicare în cadrul aceleiași rulări = cheia deterministă.
  private dedupeKey(t: NotificationTask): string {
    return keyOf(t)
  }

  // O sarcină e validă dacă are conținut și destinatari coerenți.
  private isValid(t: NotificationTask): boolean {
    if (!t.id || !t.type) return false
    if (!t.title.trim() || !t.body.trim()) return false
    if (!['all', 'user', 'users'].includes(t.recipientType)) return false
    if (t.recipientType !== 'all' && t.recipientIds.length === 0) return false
    return true
  }

  async run(
    mode: EngineRunMode = 'dry-run',
    now: number = Date.now(),
  ): Promise<EngineRunResult> {
    const logger = new NotificationLogger()
    logger.start()

    // Asigură-te că regulile s-au înregistrat în registry.
    ensureRulesRegistered()

    const rules = getActiveRules()
    const context: RuleContext = { now }
    const errors: { ruleId: string; message: string }[] = []
    const generated: NotificationTask[] = []

    // 1-3: execută fiecare regulă izolat, colectează și atribuie cheia.
    for (const rule of rules) {
      try {
        const tasks = await rule.evaluate(context)
        for (const task of tasks) {
          // Cheie unică + deterministă (dacă regula nu a setat una).
          task.notificationKey =
            task.notificationKey ?? computeNotificationKey(task)
          generated.push(task)
        }
      } catch (e) {
        const message = (e as Error).message
        errors.push({ ruleId: rule.id, message })
        console.log(`[v0] notif-engine: regula "${rule.id}" a eșuat: ${message}`)
      }
    }

    // 4: deduplicare în cadrul rulării (păstrează prima apariție).
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

    // 6: elimină notificările deja trimise (din istoric).
    let toSend: NotificationTask[] = valid
    try {
      toSend = await notificationHistory.filterNew(valid)
    } catch (e) {
      // Dacă istoricul nu e disponibil (ex. FIREBASE_SERVICE_ACCOUNT lipsă),
      // nu blocăm rularea: raportăm eroarea și continuăm fără filtrare.
      const message = (e as Error).message
      errors.push({ ruleId: '__history__', message })
      console.log(`[v0] notif-engine: istoric indisponibil: ${message}`)
    }
    const alreadySentSkipped = valid.length - toSend.length

    // 7: trimitere + salvare doar în modul 'live'.
    let dispatched = 0
    let pushSent = 0
    let pushFailed = 0
    if (mode === 'live') {
      for (const task of toSend) {
        try {
          const res = await pushService.dispatch(task)
          pushSent += res.sent
          pushFailed += res.failed
          dispatched += 1
          // Salvează în istoric DOAR după o trimitere reușită (fără excepție).
          await notificationHistory.record(task)
        } catch (e) {
          const message = (e as Error).message
          errors.push({ ruleId: `dispatch:${task.notificationKey}`, message })
          console.log(
            `[v0] notif-engine: trimiterea a eșuat pentru "${task.notificationKey}": ${message}`,
          )
        }
      }
    }

    // Metrici + log.
    logger.set('rules', rules.length)
    logger.set('notifications', generated.length)
    logger.set('duplicates', duplicatesRemoved)
    logger.set('invalid', invalidRemoved)
    logger.set('sent', dispatched)
    logger.set('ignored', invalidRemoved + alreadySentSkipped)
    const metrics = logger.finish()
    logger.summary()

    return {
      success: errors.length === 0,
      mode,
      executionTime: metrics.durationMs,
      rulesExecuted: rules.length,
      notificationsGenerated: generated.length,
      duplicatesRemoved,
      invalidRemoved,
      alreadySentSkipped,
      notifications: toSend,
      dispatched,
      pushSent,
      pushFailed,
      errors,
      ranAt: now,
    }
  }
}

// Instanță partajată (engine-ul e stateless între rulări).
export const notificationEngine = new NotificationEngine()
