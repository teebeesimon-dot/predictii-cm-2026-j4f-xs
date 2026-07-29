import { ChampionsMatchList } from '@/components/match/ChampionsMatchList'
import { GroupMatchList } from '@/components/match/GroupMatchList'
import type { Edition } from '@/lib/editions'
import type { Match } from '@/lib/types'

export function MatchList({
  matches,
  edition,
}: {
  matches: Match[]
  edition: Edition
}) {
  return edition.layout === 'champions' ? (
    <ChampionsMatchList matches={matches} edition={edition} />
  ) : (
    <GroupMatchList matches={matches} edition={edition} />
  )
}
