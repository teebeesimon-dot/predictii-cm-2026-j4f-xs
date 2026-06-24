'use server'

import { collection, getDocs, doc, writeBatch } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { runResultsSync, getSyncStatus, type SyncResult, type SyncStatus } from '@/lib/sync-results'
import { fetchCompetitionMatches } from '@/lib/football-data'
import { getEdition, getCompetition } from '@/lib/editions'
import type { Match } from '@/lib/types'

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

export interface ImportMatchesResult {
  ok: boolean
  imported: number
  message: string
}

// Importă meciurile unei ediții de la football-data.org (după codul competiției
// din registru) și le creează în Firestore, scopate pe editionId. Nu suprascrie
// dacă ediția are deja meciuri. Folosit de butonul „Încarcă meciuri" din admin.
export async function importEditionMatches(
  editionId: string,
): Promise<ImportMatchesResult> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN
  if (!token) {
    return { ok: false, imported: 0, message: 'Lipsește FOOTBALL_DATA_API_TOKEN.' }
  }

  const edition = getEdition(editionId)
  const competition = getCompetition(editionId)
  if (!edition || !competition) {
    return { ok: false, imported: 0, message: 'Ediție necunoscută.' }
  }

  try {
    // Nu importăm dacă ediția are deja meciuri (evităm duplicatele).
    const snap = await getDocs(collection(db, 'matches'))
    const already = snap.docs.some(
      (d) => (d.data() as Match).editionId === editionId,
    )
    if (already) {
      return {
        ok: false,
        imported: 0,
        message: 'Ediția are deja meciuri încărcate.',
      }
    }

    const fetched = await fetchCompetitionMatches(
      token,
      competition.footballDataCode,
    )
    // football-data filtrează implicit pe sezonul curent al competiției; pentru
    // ediții viitoare poate întoarce 0 meciuri până când sunt anunțate.
    const relevant = fetched.filter(
      (m) => new Date(m.kickoff).getUTCFullYear() === edition.year,
    )
    const toImport = relevant.length > 0 ? relevant : fetched

    if (toImport.length === 0) {
      return {
        ok: false,
        imported: 0,
        message:
          'Furnizorul nu are încă meciuri pentru această ediție. Încearcă din nou când programul e disponibil.',
      }
    }

    // Firestore acceptă max 500 operații/batch; folosim batch-uri de 400.
    const chunks: typeof toImport[] = []
    for (let i = 0; i < toImport.length; i += 400) {
      chunks.push(toImport.slice(i, i + 400))
    }
    for (const chunk of chunks) {
      const batch = writeBatch(db)
      for (const m of chunk) {
        const ref = doc(collection(db, 'matches'))
        batch.set(ref, {
          editionId,
          stage: 1,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          kickoff: m.kickoff,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
        })
      }
      await batch.commit()
    }

    return {
      ok: true,
      imported: toImport.length,
      message: `${toImport.length} meciuri importate.`,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Eroare la importul meciurilor.'
    return { ok: false, imported: 0, message }
  }
}
