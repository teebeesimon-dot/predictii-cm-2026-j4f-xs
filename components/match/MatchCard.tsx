import { CalendarClock, Clock3, Lock, Radio } from 'lucide-react'
import { MatchPredictionsLink } from '@/components/match/MatchPredictionsLink'
import { TeamName } from '@/components/team-name'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { CompetitionId } from '@/lib/editions'
import {
  formatDisplayedKickoffTime,
  getMatchDisplayStatus,
  type MatchDisplayStatus,
} from '@/lib/match-display'
import type { Match } from '@/lib/types'
import { cn, formatKickoff } from '@/lib/utils'

function MatchStatus({
  match,
  status,
}: {
  match: Match
  status: MatchDisplayStatus
}) {
  if (status === 'upcoming' || status === 'unknown') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground">
        <Clock3 className="size-3.5" />
        {formatDisplayedKickoffTime(match.kickoff)}
      </span>
    )
  }
  if (status === 'live') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase text-destructive">
        <Radio className="size-3.5" />
        Live
      </span>
    )
  }
  return (
    <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
      FT
    </span>
  )
}

export function MatchCard({
  match,
  competition,
  variant = 'compact',
  clickable = true,
  locked = false,
  className,
  children,
  now,
}: {
  match: Match
  competition: CompetitionId
  variant?: 'compact' | 'detail' | 'row'
  clickable?: boolean
  locked?: boolean
  className?: string
  children?: React.ReactNode
  now?: number
}) {
  const status = getMatchDisplayStatus(match, now)
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const detailed = variant === 'detail'
  const row = variant === 'row'

  const compactCard = (
    <Card
      className={cn(
        'transition-colors duration-200 group-hover:border-primary/50 group-hover:bg-secondary/30',
        status === 'live' ? 'border-destructive/40' : 'border-primary/30',
        className,
      )}
    >
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TeamName
              team={match.homeTeam}
              competition={competition}
              align="right"
              className="font-heading font-bold"
            />
            {hasScore ? (
              <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-sm font-bold tabular-nums">
                {match.homeScore} - {match.awayScore}
              </span>
            ) : (
              <span className="text-muted-foreground">vs</span>
            )}
            <TeamName
              team={match.awayTeam}
              competition={competition}
              className="font-heading font-bold"
            />
          </div>
          {status === 'live' ? (
            <Badge className="gap-1 bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">
              <Radio className="size-3" />
              Live
            </Badge>
          ) : status === 'finished' ? (
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              FT
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {formatKickoff(match.kickoff)}
            </span>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  )

  const card = (
    <Card
      className={cn(
        'overflow-hidden transition-colors duration-200',
        clickable &&
          'group-hover:border-primary/50 group-hover:bg-secondary/30',
        status === 'live' ? 'border-destructive/40' : 'border-primary/30',
        row &&
          'rounded-none border-0 border-l-2 border-l-transparent shadow-none group-hover:border-l-primary/50',
        className,
      )}
    >
      <CardContent className={cn('p-4', detailed && 'p-5 sm:p-6')}>
        <div
          className={cn(
            'flex items-center gap-3',
            detailed ? 'flex-col gap-4' : 'justify-between',
          )}
        >
          <div
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-3',
              detailed && 'w-full gap-4 sm:gap-6',
            )}
          >
            <TeamName
              team={match.homeTeam}
              competition={competition}
              align="right"
              flagSize={detailed ? 80 : 20}
              className={cn(
                'min-w-0 flex-1 justify-end font-heading font-bold',
                detailed && 'text-lg sm:text-xl',
              )}
            />
            <span
              className={cn(
                'shrink-0 rounded-md bg-secondary px-2 py-0.5 font-mono text-sm font-bold tabular-nums',
                detailed && 'px-3 py-1 text-lg',
              )}
            >
              {hasScore ? `${match.homeScore} – ${match.awayScore}` : 'vs'}
            </span>
            <TeamName
              team={match.awayTeam}
              competition={competition}
              flagSize={detailed ? 80 : 20}
              className={cn(
                'min-w-0 flex-1 font-heading font-bold',
                detailed && 'text-lg sm:text-xl',
              )}
            />
          </div>
          <div
            className={cn(
              'flex shrink-0 items-center gap-2',
              detailed && 'flex flex-col items-center gap-1 text-center',
            )}
          >
            <MatchStatus match={match} status={status} />
            {locked && (
              <Lock className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {detailed && (
              <span className="text-xs capitalize text-muted-foreground">
                {formatKickoff(match.kickoff)}
              </span>
            )}
          </div>
        </div>
        {children}
      </CardContent>
    </Card>
  )

  const renderedCard = variant === 'compact' ? compactCard : card
  if (!clickable) return renderedCard

  return (
    <MatchPredictionsLink
      matchId={match.id}
      ariaLabel={`Deschide centrul meciului ${match.homeTeam} - ${match.awayTeam}`}
      className="group block cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {renderedCard}
    </MatchPredictionsLink>
  )
}
