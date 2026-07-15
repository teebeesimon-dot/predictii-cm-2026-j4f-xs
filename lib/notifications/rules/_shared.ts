import type { NotificationDraft } from '@/lib/notifications/plugins/define-plugin'
import type {
  EngineData,
  EditionSnapshot,
} from '@/lib/notifications/context/EngineData'
import { hasEditionAccess, isViewOnly, type AppUser } from '@/lib/types'
import type { Scheduler } from '@/lib/schedule'
import type { StageDef } from '@/lib/stages'

/**
 * Helperi comuni pentru regulile de notificare.
 *
 * Toată logica este GENERICĂ (funcționează pentru orice competiție/ediție) și
 * se bazează pe datele partajate din context + scheduler-ul fiecărei ediții
 * (adică programul și termenele deja existente în aplicație). Nu există nicio
 * ramură hardcodată pentru o competiție anume.
 */

// Contul de administrare dedicat (nu joacă) — exclus din destinatari, la fel ca
// în clasamente (lib/data.ts computeStandings).
function isDedicatedAdmin(u: AppUser): boolean {
  return (
    u.username === 'admin' || (u.name ?? '').toLowerCase() === 'administrator'
  )
}

// Participanții unei ediții: au acces la ediție, nu sunt conturi de supraveghere
// și nu sunt contul de admin dedicat.
export function participants(data: EngineData, editionId: string): AppUser[] {
  return data.users.filter(
    (u) =>
      hasEditionAccess(u, editionId) &&
      !isViewOnly(u) &&
      !isDedicatedAdmin(u),
  )
}

// Termenul limită (epoch ms) al unei etape, din scheduler-ul ediției, sau null.
export function stageDeadlineMs(
  scheduler: Scheduler,
  stage: number,
): number | null {
  const iso = scheduler.getStageDeadline(stage)
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

// Participanții care NU au completat toate pronosticurile pentru meciurile încă
// deschise (kickoff în viitor) ale unei etape. Dacă etapa n-are meciuri
// predictibile rămase, întoarce listă goală.
export function usersMissingPredictions(
  data: EngineData,
  editionId: string,
  stage: number,
): AppUser[] {
  const matches = data
    .matchesForStage(editionId, stage)
    .filter((m) => new Date(m.kickoff).getTime() > data.now)
  if (matches.length === 0) return []
  return participants(data, editionId).filter((u) =>
    matches.some((m) => !data.hasPrediction(u.id, m.id)),
  )
}

// Fereastra de „prindere" (grace) per offset: trebuie să fie mai mare decât
// intervalul cron-ului (5 min) ca notificarea să nu fie ratată, dar suficient
// de mică încât o notificare veche să nu se declanșeze cu întârziere.
export const DEADLINE_OFFSETS = {
  '24h': { label: '24h', ms: 24 * 3600_000, grace: 3 * 3600_000 },
  '3h': { label: '3h', ms: 3 * 3600_000, grace: 45 * 60_000 },
  '1h': { label: '1h', ms: 1 * 3600_000, grace: 25 * 60_000 },
  '15m': { label: '15m', ms: 15 * 60_000, grace: 12 * 60_000 },
} as const

/**
 * Constructor comun pentru regulile de reamintire a termenului limită
 * (Deadline24h / 3h / 1h / 15m). Aceeași logică pentru toate; diferă doar
 * offset-ul. Generează câte o notificare per (ediție, etapă) DOAR pentru
 * participanții care nu și-au completat pronosticurile, cu o cheie stabilă
 * (nu depinde de cine anume lipsește), deci nu se retrimite la rulările
 * următoare chiar dacă între timp unii completează.
 */
export function buildDeadlineDrafts(
  data: EngineData,
  offsetKey: keyof typeof DEADLINE_OFFSETS,
): NotificationDraft[] {
  const { label, ms: offsetMs, grace } = DEADLINE_OFFSETS[offsetKey]
  const now = data.now
  const drafts: NotificationDraft[] = []

  for (const edition of data.editions) {
    for (const stage of edition.stages) {
      const deadline = stageDeadlineMs(edition.scheduler, stage.id)
      if (deadline === null) continue
      const marker = deadline - offsetMs
      // Fereastra de declanșare: chiar după ce s-a atins reperul, dar înainte
      // de termen.
      if (!(now >= marker && now < marker + grace && now < deadline)) continue

      const missing = usersMissingPredictions(data, edition.editionId, stage.id)
      if (missing.length === 0) continue

      drafts.push({
        values: {
          editionLabel: edition.label,
          stageName: stage.name,
        },
        id: `deadline-${label}-${edition.editionId}-${stage.id}-${deadline}`,
        // Cheie STABILĂ: nu include destinatarii, deci rămâne aceeași între
        // rulări → istoricul împiedică retrimiterea.
        notificationKey: `deadline|${edition.editionId}|${stage.id}|${label}|${deadline}`,
        recipientType: 'users',
        recipientIds: missing.map((u) => u.id),
        metadata: {
          kind: 'deadline',
          editionId: edition.editionId,
          competitionId: edition.competitionId,
          stage: stage.id,
          offset: label,
          deadline: new Date(deadline).toISOString(),
        },
        createdAt: now,
      })
    }
  }

  return drafts
}

// Reexport pentru comoditate în reguli.
export type { EditionSnapshot, StageDef }
