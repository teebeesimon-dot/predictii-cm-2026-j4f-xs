'use server'

import { runResultsSync, getSyncStatus, type SyncResult, type SyncStatus } from '@/lib/sync-results'

// Interval minim între apeluri REALE către API atunci când sincronizarea e
// declanșată din aplicație (poller-ul din browser sau butonul din admin).
// Protejează cota gratuită chiar dacă mai mulți useri au aplicația deschisă:
// apelurile mai dese de atât primesc pur și simplu ultima stare, fără a mai
// lovi API-ul.
const MIN_INTERVAL_MS = 4 * 60 * 1000 // 4 minute

export interface TriggerSyncResponse {
  ran: boolean
  result?: SyncResult
  status: SyncStatus
}

// Declanșează o sincronizare „blândă" (throttled), folosită de:
//  - poller-ul automat din aplicație (în ferestrele cu meciuri)
//  - butonul „Sincronizează acum" din admin
// `includeLive` actualizează și scorurile meciurilor în desfășurare.
export async function triggerSync(options?: {
  includeLive?: boolean
  force?: boolean
}): Promise<TriggerSyncResponse> {
  const includeLive = options?.includeLive ?? true
  const force = options?.force ?? false

  const status = await getSyncStatus()
  const now = Date.now()

  // Throttle: dacă ultima rulare a fost foarte recentă și nu forțăm, sărim
  // apelul către API și întoarcem starea curentă.
  if (!force && status.lastRunAt && now - status.lastRunAt < MIN_INTERVAL_MS) {
    return { ran: false, status }
  }

  const result = await runResultsSync({ includeLive })
  const newStatus = await getSyncStatus()
  return { ran: true, result, status: newStatus }
}

// Doar citește starea ultimei sincronizări (pentru afișare în admin).
export async function readSyncStatus(): Promise<SyncStatus> {
  return getSyncStatus()
}
