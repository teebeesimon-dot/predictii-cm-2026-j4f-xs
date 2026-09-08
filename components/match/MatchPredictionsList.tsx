import { CheckCircle2, PencilLine } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  hasEditionAccess,
  isViewOnly,
  scorePrediction,
  type AppUser,
  type Match,
  type Prediction,
} from '@/lib/types'
import { cn } from '@/lib/utils'

export function MatchPredictionsList({
  match,
  users,
  predictions,
  currentUserId,
  editionId,
  columns = 2,
}: {
  match: Match
  users: AppUser[]
  predictions: Prediction[]
  currentUserId?: string
  editionId?: string
  columns?: 1 | 2
}) {
  const matchPredictions = predictions.filter(
    (prediction) => prediction.matchId === match.id,
  )
  const activeUsers = users.filter(
    (user) =>
      !isViewOnly(user) &&
      user.username !== 'admin' &&
      (user.name ?? '').toLowerCase() !== 'administrator' &&
      (!editionId || hasEditionAccess(user, editionId)),
  )
  const activeUserIds = new Set(activeUsers.map((user) => user.id))
  const activePredictions = matchPredictions.filter((prediction) =>
    activeUserIds.has(prediction.userId),
  )
  const hasResult = match.homeScore !== null && match.awayScore !== null
  const rows = [...activeUsers]
    .map((user) => ({
      user,
      prediction:
        activePredictions.find((item) => item.userId === user.id) ?? null,
    }))
    .sort((a, b) => {
      if (!!a.prediction !== !!b.prediction) return a.prediction ? -1 : 1
      return a.user.name.localeCompare(b.user.name, 'ro')
    })

  if (activePredictions.length === 0) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        Niciun scor înregistrat pentru acest meci.
      </p>
    )
  }

  return (
    <ul
      className={cn(
        'mt-3 grid grid-cols-1 gap-1.5',
        columns === 2 && 'sm:grid-cols-2',
      )}
    >
      {rows.map(({ user, prediction }) => {
        const isMe = user.id === currentUserId
        const points = hasResult
          ? scorePrediction(prediction, match)
          : null
        const exact = points === 3
        const correct1x2 = points === 1

        return (
          <li
            key={user.id}
            className={cn(
              'flex items-center justify-between gap-3 rounded-md border px-3 py-2',
              isMe
                ? 'border-l-4 border-l-primary bg-primary/10'
                : 'border-border',
            )}
          >
            <span
              className={cn(
                'flex min-w-0 items-center gap-1.5 truncate text-sm',
                isMe && 'font-bold',
              )}
            >
              <span className="truncate">{user.name}</span>
              {isMe && (
                <Badge className="bg-primary px-1.5 py-0 text-[10px] font-bold text-primary-foreground">
                  Tu
                </Badge>
              )}
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {prediction ? (
                <span
                  className={cn(
                    'rounded font-mono text-sm font-bold tabular-nums',
                    exact && 'text-primary',
                    correct1x2 && 'text-accent',
                  )}
                >
                  {prediction.homeScore} - {prediction.awayScore}
                </span>
              ) : (
                <span className="text-xs italic text-muted-foreground">
                  fără scor
                </span>
              )}
              {prediction?.editedByAdmin && (
                <Badge
                  variant="secondary"
                  className="gap-1 px-1.5 py-0 text-[10px] font-bold"
                  title={
                    prediction.editedByAdminName
                      ? `Modificat de admin (${prediction.editedByAdminName})`
                      : 'Modificat de admin'
                  }
                >
                  <PencilLine className="size-3" />
                  Admin
                </Badge>
              )}
              {exact && (
                <Badge className="gap-1 bg-primary px-1.5 py-0 text-[10px] font-bold text-primary-foreground">
                  <CheckCircle2 className="size-3" />
                  Exact
                </Badge>
              )}
              {correct1x2 && (
                <Badge
                  variant="secondary"
                  className="px-1.5 py-0 text-[10px] font-bold"
                >
                  1X2
                </Badge>
              )}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
