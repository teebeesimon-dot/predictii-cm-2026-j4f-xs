import { Flag } from 'lucide-react'
import { MatchRow } from '@/components/match/MatchRow'
import type { Edition } from '@/lib/editions'
import { buildScheduler } from '@/lib/schedule'
import type { Match } from '@/lib/types'

export function GroupMatchList({
  matches,
  edition,
}: {
  matches: Match[]
  edition: Edition
}) {
  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-center">
        <Flag className="size-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Meciurile acestei etape nu au fost adăugate încă.
        </p>
      </div>
    )
  }

  const scheduler = buildScheduler(edition.id, matches)
  return (
    <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {matches.map((match) => (
        <MatchRow
          key={match.id}
          match={match}
          competition={edition.competitionId}
          locked={scheduler.isLocked(match)}
        />
      ))}
    </ul>
  )
}
