// Scheduler-ul termenelor limită, per competiție.
//
// PROBLEMA pe care o rezolvă: înainte, etapele și termenele erau constante
// globale hardcodate pe structura World Cup, deci ORICE competiție afișa
// aceleași etape și același „timer". Acum fiecare competiție are propriul
// program:
//   - World Cup: termene FIXE, setate manual (lib/types.ts) — neschimbat.
//   - Champions League / Euro: termenele se CALCULEAZĂ din programul real =
//     cu O ORĂ înainte de startul primului meci al etapei. La acel moment
//     etapa se blochează pentru pronosticuri ȘI devine vizibilă colegilor.
//
// Fiecare pagină construiește un scheduler din ediția curentă (useEdition) și
// meciurile ei (useMatches), apoi îl folosește pentru blocare/dezvăluire,
// etapă activă, etapă live și termenele afișate.

import { getEdition, type CompetitionId } from './editions'
import {
  getDeadline as wcGetDeadline,
  isLocked as wcIsLocked,
  getActiveStage as wcGetActiveStage,
  getLiveStage as wcGetLiveStage,
  getStageDeadline as wcGetStageDeadline,
  type Match,
} from './types'
import { stagesForCompetition, type StageDef } from './stages'

// Cu cât timp înainte de primul meci al etapei se blochează pronosticurile
// (și devin vizibile colegilor) la competițiile cu termene calculate.
const LOCK_LEAD_MS = 60 * 60 * 1000 // 1 oră

type MatchLike = Pick<Match, 'stage' | 'round' | 'kickoff'>

export interface Scheduler {
  editionId: string
  competitionId: CompetitionId
  stages: StageDef[]
  // Termenul limită (ISO) al etapei din care face parte meciul, sau null.
  getMatchDeadline(match: MatchLike): string | null
  // Meciul e blocat (termenul a trecut)?
  isLocked(match: MatchLike): boolean
  // Termenul limită (ISO) al unei etape, sau null dacă nu se poate determina.
  getStageDeadline(stage: number): string | null
  // Pronosticurile etapei au fost dezvăluite? (același moment cu blocarea)
  isStageRevealed(stage: number): boolean
  // Etapa activă pentru pronosticuri = prima al cărei termen nu a trecut încă.
  getActiveStage(): number
  // Etapa care se joacă efectiv acum (cea mai avansată cu meci început).
  getLiveStage(): number
}

export function buildScheduler(
  editionId: string,
  matches: Match[] = [],
): Scheduler {
  const competitionId = getEdition(editionId)?.competitionId ?? 'wc'
  const stages = stagesForCompetition(competitionId)

  // World Cup păstrează termenele fixe setate manual (comportament neschimbat).
  if (competitionId === 'wc') {
    return {
      editionId,
      competitionId,
      stages,
      getMatchDeadline: (m) => wcGetDeadline(m),
      isLocked: (m) => wcIsLocked(m),
      getStageDeadline: (s) => wcGetStageDeadline(s),
      isStageRevealed: (s) => {
        const d = wcGetStageDeadline(s)
        return d ? Date.now() >= new Date(d).getTime() : false
      },
      getActiveStage: () => wcGetActiveStage(),
      getLiveStage: () => wcGetLiveStage(matches),
    }
  }

  // Celelalte competiții (Champions League, Euro): termene calculate din program.
  const firstKickoffByStage = new Map<number, number>()
  for (const m of matches) {
    const t = new Date(m.kickoff).getTime()
    if (Number.isNaN(t)) continue
    const cur = firstKickoffByStage.get(m.stage)
    if (cur === undefined || t < cur) firstKickoffByStage.set(m.stage, t)
  }

  const deadlineMs = (stage: number): number | null => {
    const k = firstKickoffByStage.get(stage)
    return k === undefined ? null : k - LOCK_LEAD_MS
  }

  const getStageDeadline = (stage: number): string | null => {
    const ms = deadlineMs(stage)
    return ms === null ? null : new Date(ms).toISOString()
  }

  const isStageRevealed = (stage: number): boolean => {
    const ms = deadlineMs(stage)
    return ms !== null && Date.now() >= ms
  }

  const isLockedFn = (m: MatchLike): boolean => {
    const ms = deadlineMs(m.stage)
    if (ms === null) {
      // Etapa n-are încă termen calculabil → rezervă de siguranță pe kickoff.
      const k = new Date(m.kickoff).getTime()
      return !Number.isNaN(k) && Date.now() >= k
    }
    return Date.now() >= ms
  }

  return {
    editionId,
    competitionId,
    stages,
    getMatchDeadline: (m) => getStageDeadline(m.stage),
    isLocked: isLockedFn,
    getStageDeadline,
    isStageRevealed,
    getActiveStage: () => {
      let last = stages[0]?.id ?? 1
      for (const s of stages) {
        const ms = deadlineMs(s.id)
        if (ms === null) continue
        last = s.id
        if (Date.now() < ms) return s.id
      }
      return last
    },
    getLiveStage: () => {
      const now = Date.now()
      let live: number | null = null
      for (const m of matches) {
        const t = new Date(m.kickoff).getTime()
        if (!Number.isNaN(t) && t <= now) {
          if (live === null || m.stage > live) live = m.stage
        }
      }
      return live ?? stages[0]?.id ?? 1
    },
  }
}
