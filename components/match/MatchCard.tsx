import { CalendarClock, Lock } from 'lucide-react'
import { MatchPredictionsLink } from '@/components/match/MatchPredictionsLink'
import { TeamName } from '@/components/team-name'
import { Card, CardContent } from '@/components/ui/card'
import type { CompetitionId } from '@/lib/editions'
import {
  getLiveLabel,
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
  if (status === 'live') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide text-destructive">
        {getLiveLabel(match)}
      </span>
    )
  }
  if (status === 'finished') {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        FT
      </span>
    )
  }
  return null
}

function MatchScore({
  match,
  status,
  locked,
  detailed = false,
}: {
  match: Match
  status: MatchDisplayStatus
  locked: boolean
  detailed?: boolean
}) {
  const hasScore = match.homeScore !== null && match.awayScore !== null
  const hasStatus = status === 'live' || status === 'finished'

  return (
    <div className="flex min-w-0 shrink-0 flex-col items-center gap-1">
      <span
        className={cn(
          'rounded-md bg-secondary px-2 py-0.5 font-mono text-sm font-bold tabular-nums',
          detailed && 'px-3 py-1 text-lg',
        )}
      >
        {hasScore ? `${match.homeScore} – ${match.awayScore}` : 'vs'}
      </span>
      <div className="flex min-h-4 items-center justify-center gap-1.5">
        {hasStatus && <MatchStatus match={match} status={status} />}
        {locked && (
          <Lock
            aria-label="Pronostic închis"
            className="size-4 shrink-0 text-muted-foreground"
          />
        )}
      </div>
    </div>
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
  // Cardurile din listele fără ceas propriu au nevoie de statusul actual.
  // eslint-disable-next-line react-hooks/purity
  const displayNow = now ?? Date.now()
  const status = getMatchDisplayStatus(match, displayNow)
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
            <MatchScore match={match} status={status} locked={locked} />
            <TeamName
              team={match.awayTeam}
              competition={competition}
              className="min-w-0 flex-1 font-heading font-bold"
              wrap
            />
          </div>
          {status !== 'live' && status !== 'finished' && displayKickoff && (
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
            'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3',
            detailed && 'w-full gap-4 sm:gap-6',
          )}
        >
          <div className="contents">
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
            <MatchScore
              match={match}
              status={status}
              locked={locked}
              detailed={detailed}
            />
            <TeamName
              team={match.awayTeam}
              competition={competition}
              flagSize={detailed ? 80 : 20}
              wrap
              className={cn(
                'min-w-0 flex-1 font-heading font-bold',
                detailed && 'text-lg sm:text-xl',
              )}
            />
          </div>
          {detailed && displayKickoff && (
            <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1 text-xs capitalize text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {formatKickoff(match.kickoff)}
            </span>
          )}
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
