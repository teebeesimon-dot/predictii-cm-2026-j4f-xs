/**
 * Logger dedicat pentru Notification Engine.
 *
 * Momentan doar logging (console). Acumulează metrici despre o rulare și le
 * afișează structurat. Extensibil ulterior către un sink persistent.
 */
export interface RunMetrics {
  durationMs: number
  rules: number
  notifications: number
  duplicates: number
  invalid: number
  sent: number
  ignored: number
}

export class NotificationLogger {
  private startedAt = 0
  private metrics: RunMetrics = {
    durationMs: 0,
    rules: 0,
    notifications: 0,
    duplicates: 0,
    invalid: 0,
    sent: 0,
    ignored: 0,
  }

  start(): void {
    this.startedAt = Date.now()
  }

  set<K extends keyof RunMetrics>(key: K, value: RunMetrics[K]): void {
    this.metrics[key] = value
  }

  // Finalizează măsurarea duratei și întoarce metricile curente.
  finish(): RunMetrics {
    this.metrics.durationMs = this.startedAt ? Date.now() - this.startedAt : 0
    return { ...this.metrics }
  }

  // Afișează un rezumat lizibil în consolă (prefix [v0] pentru filtrare).
  summary(): void {
    const m = this.metrics
    console.log(
      `[v0] notif-engine: durata=${m.durationMs}ms reguli=${m.rules} ` +
        `generate=${m.notifications} duplicate=${m.duplicates} ` +
        `invalide=${m.invalid} trimise=${m.sent} ignorate=${m.ignored}`,
    )
  }
}
