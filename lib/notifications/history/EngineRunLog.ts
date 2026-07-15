import 'server-only'
import { adminDb } from '@/lib/firebase-admin'
import type { EngineRunResult } from '@/lib/notifications/types'

/**
 * Jurnalul rulărilor Notification Engine.
 *
 * Persistă un rezumat al fiecărei rulări „live" pentru panoul de administrare
 * (execuții, notificări trimise, eșuate, erori). NU este apelat din engine —
 * engine-ul rămâne fără efecte secundare de persistență proprie. Rutele
 * (cron + admin) apelează `recordRun` DUPĂ ce engine-ul întoarce rezultatul.
 *
 * Stocare: un singur document `meta/notification_engine_log` care ține ultimele
 * N rulări într-un array. Astfel citirea din admin costă O SINGURĂ citire, iar
 * scrierea nu creează o colecție nouă cu multe documente.
 */
const LOG_DOC = 'notification_engine_log'
const MAX_ENTRIES = 25

export interface EngineRunLogEntry {
  ranAt: number
  mode: string
  success: boolean
  rulesExecuted: number
  notificationsGenerated: number
  dispatched: number
  pushSent: number
  pushFailed: number
  alreadySentSkipped: number
  errorCount: number
  errors: { ruleId: string; message: string }[]
  executionTime: number
}

function toEntry(result: EngineRunResult): EngineRunLogEntry {
  return {
    ranAt: result.ranAt,
    mode: result.mode,
    success: result.success,
    rulesExecuted: result.rulesExecuted,
    notificationsGenerated: result.notificationsGenerated,
    dispatched: result.dispatched,
    pushSent: result.pushSent,
    pushFailed: result.pushFailed,
    alreadySentSkipped: result.alreadySentSkipped,
    errorCount: result.errors.length,
    // Limităm la primele erori ca documentul să rămână mic.
    errors: result.errors.slice(0, 10),
    executionTime: result.executionTime,
  }
}

export async function recordRun(result: EngineRunResult): Promise<void> {
  try {
    const ref = adminDb().collection('meta').doc(LOG_DOC)
    const snap = await ref.get()
    const prev: EngineRunLogEntry[] = snap.exists
      ? ((snap.data()?.entries as EngineRunLogEntry[]) ?? [])
      : []
    const entries = [toEntry(result), ...prev].slice(0, MAX_ENTRIES)
    await ref.set({ entries, updatedAt: Date.now() }, { merge: true })
  } catch (e) {
    // Jurnalul e auxiliar: nu blocăm răspunsul dacă scrierea eșuează.
    console.log('[v0] engine-run-log: nu am putut salva rularea:', (e as Error).message)
  }
}

export async function getRunLog(): Promise<EngineRunLogEntry[]> {
  try {
    const snap = await adminDb().collection('meta').doc(LOG_DOC).get()
    if (!snap.exists) return []
    return (snap.data()?.entries as EngineRunLogEntry[]) ?? []
  } catch {
    return []
  }
}
