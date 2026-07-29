'use client'

import { MatchCard } from '@/components/match/MatchCard'
import type { CompetitionId } from '@/lib/editions'
import type { Match } from '@/lib/types'

export function MatchRow({
  match,
  competition,
  locked,
}: {
  match: Match
  competition: CompetitionId
  locked: boolean
}) {
  return (
    <li>
      <MatchCard
        match={match}
        competition={competition}
        variant="row"
        locked={locked}
      />
    </li>
  )
}
