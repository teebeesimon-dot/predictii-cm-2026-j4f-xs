import MatchDetails from '@/components/match-details'

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>
}) {
  const { matchId } = await params

  return <MatchDetails matchId={matchId} />
}
