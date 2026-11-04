import type {
  EngineRunMode,
  EngineRunResult,
  NotificationTask,
  RuleContext,
  RuleRunSummary,
  SkippedNotification,
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
import type { EngineData } from '@/lib/notifications/context/EngineData'
import {
  loadEngineData,
  emptyEngineData,
} from '@/lib/notifications/context/EngineDataSource'

type DataLoader = (now: number) => Promise<EngineData>

/**
 * NotificationEngine decides which notifications should be sent, validates
 * them, deduplicates them and dispatches them through Firebase Cloud Messaging.
 */
export class NotificationEngine {
  private dedupeKey(t: NotificationTask): string {
    return keyOf(t)
  }

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
    loadData: DataLoader = loadEngineData,
  ): Promise<EngineRunResult> {
    const logger = new NotificationLogger()
    logger.start()
    ensureRulesRegistered()

    const errors: { ruleId: string; message: string }[] = []
    let data: EngineData
    try {
      data = await loadData(now)
    } catch (e) {
      const message = (e as Error).message
      errors.push({ ruleId: '__data__', message })
      console.log(`[v0] notif-engine: încărcarea datelor a eșuat: ${message}`)
      data = emptyEngineData(now)
    }

    const rules = getActiveRules()
    const context: RuleContext = { now, data }
    const generated: NotificationTask[] = []
    const ruleResults: RuleRunSummary[] = []

    for (const rule of rules) {
      let count = 0
      let failed = false
      try {
        const tasks = await rule.evaluate(context)
        for (const task of tasks) {
          task.notificationKey =
            task.notificationKey ?? computeNotificationKey(task)
          generated.push(task)
          count += 1
        }
      } catch (e) {
        failed = true
        const message = (e as Error).message
        errors.push({ ruleId: rule.id, message })
        console.log(`[v0] notif-engine: regula "${rule.id}" a eșuat: ${message}`)
      }
      ruleResults.push({
        ruleId: rule.id,
        description: rule.description,
        generated: count,
        failed,
      })
    }

    const skipped: SkippedNotification[] = []
    const asSkip = (
      t: NotificationTask,
      reason: SkippedNotification['reason'],
    ): SkippedNotification => ({
      key: keyOf(t),
      type: t.type,
      title: t.title,
      reason,
    })

    const seen = new Set<string>()
    const deduped: NotificationTask[] = []
    for (const task of generated) {
      const key = this.dedupeKey(task)
      if (seen.has(key)) {
        skipped.push(asSkip(task, 'duplicat'))
        continue
      }
      seen.add(key)
      deduped.push(task)
    }
    const duplicatesRemoved = generated.length - deduped.length

    const valid: NotificationTask[] = []
    for (const t of deduped) {
      if (this.isValid(t)) valid.push(t)
      else skipped.push(asSkip(t, 'invalidă'))
    }
    const invalidRemoved = deduped.length - valid.length

    let toSend: NotificationTask[] = valid
    try {
      toSend = await notificationHistory.filterNew(valid)
      const kept = new Set(toSend.map((t) => keyOf(t)))
      for (const t of valid) {
        if (!kept.has(keyOf(t))) skipped.push(asSkip(t, 'deja trimisă'))
      }
    } catch (e) {
      const message = (e as Error).message
      errors.push({ ruleId: '__history__', message })
      console.log(`[v0] notif-engine: istoric indisponibil: ${message}`)
    }
    const alreadySentSkipped = valid.length - toSend.length

    let dispatched = 0
    let pushSent = 0
    let pushFailed = 0
    if (mode === 'live') {
      const delivered: NotificationTask[] = []
      for (const task of toSend) {
        try {
          const res = await pushService.dispatch(task, data.users)
          pushSent += res.sent
          pushFailed += res.failed
          dispatched += 1

          // Nu marcăm notificarea drept trimisă dacă nu a ajuns la niciun
          // dispozitiv. În acest fel, un utilizator care își înregistrează
          // telefonul ulterior poate primi notificarea la următoarea rulare.
          if (res.sent > 0) {
            delivered.push(task)
          } else {
            console.log(
              `[v0] notif-engine: "${task.notificationKey}" nu a fost arhivată: niciun dispozitiv FCM nu a confirmat livrarea.`,
            )
          }
        } catch (e) {
          const message = (e as Error).message
          errors.push({ ruleId: `dispatch:${task.notificationKey}`, message })
          console.log(
            `[v0] notif-engine: trimiterea a eșuat pentru "${task.notificationKey}": ${message}`,
          )
        }
      }
      try {
        await notificationHistory.recordMany(delivered)
      } catch (e) {
        const message = (e as Error).message
        errors.push({ ruleId: '__history_write__', message })
        console.log(`[v0] notif-engine: salvarea istoricului a eșuat: ${message}`)
      }
    }

    logger.set('rules', rules.length)
    logger.set('notifications', generated.length)
    logger.set('duplicates', duplicatesRemoved)
    logger.set('invalid', invalidRemoved)
    logger.set('sent', dispatched)
    logger.set('ignored', invalidRemoved + alreadySentSkipped + duplicatesRemoved)
    const metrics = logger.finish()
    logger.summary()

    return {
      success: errors.length === 0,
      mode,
      executionTime: metrics.durationMs,
      rulesExecuted: rules.length,
      ruleResults,
      notificationsGenerated: generated.length,
      duplicatesRemoved,
      invalidRemoved,
      alreadySentSkipped,
      skipped,
      notifications: toSend,
      dispatched,
      pushSent,
      pushFailed,
      errors,
      ranAt: now,
    }
  }
}

export const notificationEngine = new NotificationEngine()
