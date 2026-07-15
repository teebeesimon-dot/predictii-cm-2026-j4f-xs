'use server'

import {
  collection,
  getDocs,
  doc,
  writeBatch,
  query,
  where,
  limit,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { runResultsSync, getSyncStatus, type SyncResult, type SyncStatus } from '@/lib/sync-results'
import {
  fetchCompetitionMatches,
  fetchWorldCupMatchesStaged,
  fetchStagedMatches,
  teamPairKey,
} from '@/lib/football-data'
import { getEdition, getCompetition } from '@/lib/editions'
import {
  DEFAULT_EDITION_ID,
  type Match,
  type StageId,
  type KnockoutRound,
} from '@/lib/types'

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
    const snap = await getDocs(
      query(
        collection(db, 'matches'),
        where('editionId', '==', editionId),
        limit(1),
      ),
    )
    const already = !snap.empty
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

export interface ImportStageResult {
  ok: boolean
  imported: number
  // Câte meciuri din fază nu au încă echipe stabilite (TBD la tragerea la sorți).
  pending: number
  // Nume de echipe pe care nu le-am putut mapa la forma românească (de adăugat
  // în aliasurile din lib/football-data.ts).
  unmapped: string[]
  message: string
}

// Maparea fazelor football-data.org → modelul nostru (etapă + rundă).
// Faza eliminatorie a CM 2026:
//  - LAST_32        → Etapa 4 (șaisprezecimi)
//  - LAST_16        → Etapa 5, runda 'r16'   (optimi)
//  - QUARTER_FINALS → Etapa 5, runda 'qf'    (sferturi)
//  - SEMI_FINALS    → Etapa 5, runda 'sf'    (semifinale)
//  - THIRD_PLACE    → Etapa 5, runda 'final' (finala mică)
//  - FINAL          → Etapa 5, runda 'final' (finala mare)
const KNOCKOUT_STAGE_MAP: Record<
  string,
  { stage: StageId; round?: KnockoutRound }
> = {
  LAST_32: { stage: 4 },
  LAST_16: { stage: 5, round: 'r16' },
  QUARTER_FINALS: { stage: 5, round: 'qf' },
  SEMI_FINALS: { stage: 5, round: 'sf' },
  THIRD_PLACE: { stage: 5, round: 'final' },
  FINAL: { stage: 5, round: 'final' },
}

// Importă întreaga fază eliminatorie a CM 2026 (șaisprezecimi → finală) din
// football-data.org și o creează în Firestore. Este IDEMPOTENT și INCREMENTAL:
//  - creează doar meciurile cu ambele echipe deja stabilite (mapate la RO);
//  - sare peste meciurile deja existente (identificate după perechea de echipe);
//  - meciurile încă „TBD" (necompletate de furnizor) sunt raportate ca `pending`,
//    astfel încât adminul poate reapăsa butonul după fiecare tragere la sorți ca
//    să adauge meciurile noi, fără duplicate.
// Scorurile se vor sincroniza apoi automat (sincronizarea le potrivește după
// perechea de echipe).
export async function importWorldCupKnockout(): Promise<ImportStageResult> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN
  if (!token) {
    return {
      ok: false,
      imported: 0,
      pending: 0,
      unmapped: [],
      message: 'Lipsește FOOTBALL_DATA_API_TOKEN.',
    }
  }

  try {
    const all = await fetchWorldCupMatchesStaged(token)
    const knockout = all.filter((m) => m.apiStage in KNOCKOUT_STAGE_MAP)

    if (knockout.length === 0) {
      return {
        ok: false,
        imported: 0,
        pending: 0,
        unmapped: [],
        message:
          'Furnizorul nu are încă meciurile din faza eliminatorie. Încearcă din nou mai târziu.',
      }
    }

    // Citim doar etapele eliminatorii, inclusiv documentele WC legacy fără
    // editionId, în loc să scanăm toate meciurile tuturor competițiilor.
    const snap = await getDocs(
      query(collection(db, 'matches'), where('stage', 'in', [4, 5])),
    )
    const existingPairs = new Set<string>()
    for (const d of snap.docs) {
      const m = d.data() as Match
      if ((m.editionId ?? DEFAULT_EDITION_ID) !== DEFAULT_EDITION_ID) continue
      if (m.stage !== 4 && m.stage !== 5) continue
      existingPairs.add(`${m.stage}|${teamPairKey(m.homeTeam, m.awayTeam)}`)
    }

    let imported = 0
    let pending = 0
    const unmapped = new Set<string>()
    const batch = writeBatch(db)

    for (const m of knockout) {
      const mapping = KNOCKOUT_STAGE_MAP[m.apiStage]
      const hasTeams = !!m.rawHome && !!m.rawAway
      if (!hasTeams) {
        pending += 1
        continue
      }
      // Echipe stabilite, dar nemapate la RO: le semnalăm și sărim peste (ca să
      // nu stricăm potrivirea scorurilor, care se face pe nume românești).
      if (!m.roHome) unmapped.add(m.rawHome as string)
      if (!m.roAway) unmapped.add(m.rawAway as string)
      if (!m.roHome || !m.roAway) {
        pending += 1
        continue
      }

      const key = `${mapping.stage}|${teamPairKey(m.roHome, m.roAway)}`
      if (existingPairs.has(key)) continue

      const ref = doc(collection(db, 'matches'))
      batch.set(ref, {
        editionId: DEFAULT_EDITION_ID,
        stage: mapping.stage,
        // câmpul `round` doar pentru Etapa 5 (rundele eliminatorii)
        ...(mapping.round ? { round: mapping.round } : {}),
        homeTeam: m.roHome,
        awayTeam: m.roAway,
        kickoff: m.kickoff,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })
      existingPairs.add(key)
      imported += 1
    }

    if (imported > 0) await batch.commit()

    const parts: string[] = []
    if (imported > 0) parts.push(`${imported} meciuri importate`)
    if (pending > 0) parts.push(`${pending} încă fără echipe stabilite`)
    if (imported === 0 && pending === 0)
      parts.push('toate meciurile erau deja încărcate')
    const unmappedArr = Array.from(unmapped)
    if (unmappedArr.length > 0)
      parts.push(`nemapate: ${unmappedArr.join(', ')}`)

    return {
      ok: true,
      imported,
      pending,
      unmapped: unmappedArr,
      message: parts.join(' · ') + '.',
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Eroare la importul fazei eliminatorii.'
    return { ok: false, imported: 0, pending: 0, unmapped: [], message }
  }
}

// Maparea fazelor football-data.org (Champions League) → etapele noastre.
// Faza-ligă (LEAGUE_STAGE) folosește matchday 1-8 → Etapele 1-8. Restul sunt
// faze eliminatorii cu etapă fixă.
//  - LEAGUE_STAGE (matchday 1..8) → Etapele 1..8
//  - PLAYOFFS        → Etapa 9  (baraj, tur-retur)
//  - LAST_16         → Etapa 10 (optimi, tur-retur)
//  - QUARTER_FINALS  → Etapa 11
//  - SEMI_FINALS     → Etapa 11
//  - FINAL           → Etapa 11
const CL_KNOCKOUT_STAGE_MAP: Record<string, StageId> = {
  PLAYOFFS: 9,
  LAST_16: 10,
  QUARTER_FINALS: 11,
  SEMI_FINALS: 11,
  FINAL: 11,
}

function clStageFor(apiStage: string, matchday: number | null): StageId | null {
  if (apiStage === 'LEAGUE_STAGE' || apiStage === 'GROUP_STAGE') {
    if (matchday && matchday >= 1 && matchday <= 8) return matchday as StageId
    return null
  }
  return CL_KNOCKOUT_STAGE_MAP[apiStage] ?? null
}

// Importă meciurile Champions League din football-data.org și le creează în
// Firestore pentru ediția CL dată. Ca la World Cup: IDEMPOTENT și INCREMENTAL
// (dedup pe etapă + perechea de echipe), creează doar meciurile cu echipe
// stabilite, raportează câte sunt încă TBD. Echipele sunt cluburi, deci
// folosim numele brute din API (fără mapare la RO). Scorurile (90') se
// sincronizează apoi automat prin importul generic de rezultate.
export async function importChampionsLeague(
  editionId: string,
): Promise<ImportStageResult> {
  const token = process.env.FOOTBALL_DATA_API_TOKEN
  if (!token) {
    return {
      ok: false,
      imported: 0,
      pending: 0,
      unmapped: [],
      message: 'Lipsește FOOTBALL_DATA_API_TOKEN.',
    }
  }

  const edition = getEdition(editionId)
  const competition = getCompetition(editionId)
  if (!edition || !competition || edition.competitionId !== 'cl') {
    return {
      ok: false,
      imported: 0,
      pending: 0,
      unmapped: [],
      message: 'Selectează o ediție de Champions League pentru acest import.',
    }
  }

  try {
    const all = await fetchStagedMatches(token, competition.footballDataCode)
    if (all.length === 0) {
      return {
        ok: false,
        imported: 0,
        pending: 0,
        unmapped: [],
        message:
          'Furnizorul nu are încă meciuri pentru această competiție. Încearcă mai târziu.',
      }
    }

    // Citim doar meciurile ediției curente, nu toate competițiile.
    const snap = await getDocs(
      query(collection(db, 'matches'), where('editionId', '==', editionId)),
    )
    const existingPairs = new Set<string>()
    for (const d of snap.docs) {
      const m = d.data() as Match
      if ((m.editionId ?? DEFAULT_EDITION_ID) !== editionId) continue
      existingPairs.add(`${m.stage}|${m.homeTeam}|${m.awayTeam}`)
    }

    let imported = 0
    let pending = 0
    const batch = writeBatch(db)

    for (const m of all) {
      const stage = clStageFor(m.apiStage, m.matchday)
      if (stage === null) continue // fază necunoscută → ignorăm

      const home = m.rawHome
      const away = m.rawAway
      if (!home || !away) {
        pending += 1
        continue
      }

      // Cheie ORDONATĂ (gazdă|oaspete): distinge manșa tur de retur la
      // eliminatoriile tur-retur (A-B vs B-A sunt meciuri diferite).
      const key = `${stage}|${home}|${away}`
      if (existingPairs.has(key)) continue

      const ref = doc(collection(db, 'matches'))
      batch.set(ref, {
        editionId,
        stage,
        homeTeam: home,
        awayTeam: away,
        kickoff: m.kickoff,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      })
      existingPairs.add(key)
      imported += 1
    }

    if (imported > 0) await batch.commit()

    const parts: string[] = []
    if (imported > 0) parts.push(`${imported} meciuri importate`)
    if (pending > 0) parts.push(`${pending} încă fără echipe stabilite`)
    if (imported === 0 && pending === 0)
      parts.push('toate meciurile erau deja încărcate')

    return {
      ok: true,
      imported,
      pending,
      unmapped: [],
      message: parts.join(' · ') + '.',
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Eroare la importul Champions League.'
    return { ok: false, imported: 0, pending: 0, unmapped: [], message }
  }
}
