'use client'

import { MatchCard } from '@/components/match/MatchCard'
import type { CompetitionId } from '@/lib/editions'
import type { Match } from '@/lib/types'

export function MatchRow({
  match,
  competition,
  locked,
  showKickoff = true,
}: {
  match: Match
  competition: CompetitionId
  locked: boolean
  showKickoff?: boolean
}) {
  return (
    <li>
      <MatchCard
        match={match}
        competition={competition}
        variant="row"
        locked={locked}
        showKickoff={showKickoff}
      />
    </li>
  )
}
