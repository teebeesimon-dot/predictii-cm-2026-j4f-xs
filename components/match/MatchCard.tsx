import { CalendarClock, Clock3, Lock } from 'lucide-react'
import { MatchPredictionsLink } from '@/components/match/MatchPredictionsLink'
import { TeamName } from '@/components/team-name'
import { Card, CardContent } from '@/components/ui/card'
import type { CompetitionId } from '@/lib/editions'
import {
  formatDisplayedKickoffTime,
  getLiveLabel,
  getMatchDisplayStatus,
  type MatchDisplayStatus,
} from '@/lib/match-display'
import type { Match } from '@/lib/types'
import { cn, formatKickoff } from '@/lib/utils'

function MatchStatus({
  match,
  status,
  showKickoff = true,
}: {
  match: Match
  status: MatchDisplayStatus
  showKickoff?: boolean
}) {
  if (status === 'upcoming' || status === 'unknown') {
    if (!showKickoff) return null
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium tabular-nums text-muted-foreground">
        <Clock3 className="size-3.5" />
        {formatDisplayedKickoffTime(match.kickoff)}
      </span>
    )
  }
  if (status === 'live') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide text-destructive">
        {getLiveLabel(match)}
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
  showKickoff,
}: {
  match: Match
  competition: CompetitionId
  variant?: 'compact' | 'detail' | 'row'
  clickable?: boolean
  locked?: boolean
  className?: string
  children?: React.ReactNode
  now?: number
  showKickoff?: boolean
}) {
  const displayNow = now ?? Date.now()
  const status = getMatchDisplayStatus(match, displayNow)
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const detailed = variant === 'detail'
  const row = variant === 'row'
  const displayKickoff = showKickoff ?? true

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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamName
              team={match.homeTeam}
              competition={competition}
              align="right"
              className="min-w-0 flex-1 font-heading font-bold"
              wrap
            />
            <div className="flex shrink-0 flex-col items-center gap-0.5">
              {hasScore ? (
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-sm font-bold tabular-nums">
                  {match.homeScore} - {match.awayScore}
                </span>
              ) : (
                <span className="text-muted-foreground">vs</span>
              )}
              {status === 'live' && (
                <MatchStatus
                  match={match}
                  status={status}
                  showKickoff={displayKickoff}
                />
              )}
            </div>
            <TeamName
              team={match.awayTeam}
              competition={competition}
              className="min-w-0 flex-1 font-heading font-bold"
              wrap
            />
          </div>
          {status === 'live' ? null : status === 'finished' ? (
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
      <CardContent
        className={cn('relative p-4', detailed && 'p-5 sm:p-6')}
      >
        <div
          className={cn(
            'items-center gap-3',
            detailed
              ? 'flex flex-col gap-4'
              : 'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]',
          )}
        >
          <div
            className={cn(
              detailed
                ? 'flex w-full items-center justify-center gap-4 sm:gap-6'
                : 'contents',
            )}
          >
            <TeamName
              team={match.homeTeam}
              competition={competition}
              align="right"
              flagSize={detailed ? 80 : 20}
              wrap
              className={cn(
                'min-w-0 flex-1 justify-end font-heading font-bold',
                detailed && 'text-lg sm:text-xl',
              )}
            />
            <div className="flex min-w-0 shrink-0 flex-col items-center gap-0.5">
              <span
                className={cn(
                  'rounded-md bg-secondary px-2 py-0.5 font-mono text-sm font-bold tabular-nums',
                  detailed && 'px-3 py-1 text-lg',
                )}
              >
                {hasScore ? `${match.homeScore} – ${match.awayScore}` : 'vs'}
              </span>
              {status === 'live' && (
                <MatchStatus
                  match={match}
                  status={status}
                  showKickoff={displayKickoff}
                />
              )}
            </div>
            <TeamName
              team={match.awayTeam}
              competition={competition}
              flagSize={detailed ? 80 : 20}
              wrap
              className={cn(
                'min-w-0 flex-1 font-heading font-bold',
                detailed && 'text-lg sm:text-xl',
                row && 'pr-8',
              )}
            />
          </div>
          <div
            className={cn(
              'flex shrink-0 items-center gap-2',
              !detailed && 'absolute right-4 top-1/2 -translate-y-1/2',
              detailed && 'flex flex-col items-center gap-1 text-center',
            )}
          >
            {status !== 'live' && (
              <MatchStatus
                match={match}
                status={status}
                showKickoff={displayKickoff}
              />
            )}
            {locked && (
              <Lock className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            {detailed && (
              <span className="text-xs capitalize text-muted-foreground">
                {displayKickoff && formatKickoff(match.kickoff)}
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
