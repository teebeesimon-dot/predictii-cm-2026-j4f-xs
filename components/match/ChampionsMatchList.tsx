import { Flag } from 'lucide-react'
import { MatchRow } from '@/components/match/MatchRow'
import type { Edition } from '@/lib/editions'
import {
  formatDisplayedKickoffTime,
  getDisplayedKickoffGroupKey,
} from '@/lib/match-display'
import { buildScheduler } from '@/lib/schedule'
import type { Match } from '@/lib/types'
import { formatKickoff } from '@/lib/utils'

export function ChampionsMatchList({
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

  const sortedMatches = [...matches].sort(
    (a, b) => +new Date(a.kickoff) - +new Date(b.kickoff),
  )
  const scheduler = buildScheduler(edition.id, sortedMatches)
  const groups = new Map<
    string,
    { time: string; label: string; matches: Match[] }
  >()

  for (const match of sortedMatches) {
    const time = formatDisplayedKickoffTime(match.kickoff)
    const key = getDisplayedKickoffGroupKey(match.kickoff)
    const group = groups.get(key)
    if (group) group.matches.push(match)
    else {
      groups.set(key, {
        time,
        label: formatKickoff(match.kickoff),
        matches: [match],
      })
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {[...groups.entries()].map(([key, group]) => (
        <section key={key} className="flex flex-col gap-1">
          <h3 className="font-heading text-sm font-bold tabular-nums text-muted-foreground">
            {group.label}
          </h3>
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
            {group.matches.map((match) => (
              <MatchRow
                key={match.id}
                match={match}
                competition={edition.competitionId}
                locked={scheduler.isLocked(match)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
