'use client'

import { useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { TeamName } from '@/components/team-name'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import {
  STAGES,
  type StageId,
  type Match,
  type Prediction,
  type AppUser,
  isLocked,
  scorePrediction,
} from '@/lib/types'
import { formatKickoff } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Lock, Users, CheckCircle2 } from 'lucide-react'

export default function ColleaguesPage() {
  return (
    <AppShell>
      <ColleaguesContent />
    </AppShell>
  )
}

function ColleaguesContent() {
  const { user } = useAuth()
  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Pronosticurile colegilor</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Vezi ce a pronosticat fiecare coleg. Pronosticurile unui meci se
          dezvăluie abia după ce s-a închis completarea pentru acea etapă.
        </p>
      </div>

      {loading || !ready ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <StageTabs
          users={users}
          matches={matches}
          predictions={predictions}
          currentUserId={user?.id}
        />
      )}
    </div>
  )
}

function StageTabs({
  users,
  matches,
  predictions,
  currentUserId,
}: {
  users: AppUser[]
  matches: Match[]
  predictions: Prediction[]
  currentUserId?: string
}) {
  // Prima etapă care are meciuri devine tab-ul implicit.
  const stagesWithMatches = STAGES.filter((s) =>
    matches.some((m) => m.stage === s.id),
  )
  const defaultTab = String(stagesWithMatches[0]?.id ?? 1)

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
        {STAGES.map((s) => (
          <TabsTrigger
            key={s.id}
            value={String(s.id)}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {s.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {STAGES.map((s) => (
        <TabsContent key={s.id} value={String(s.id)} className="mt-4">
          <StageMatches
            stageId={s.id}
            users={users}
            matches={matches}
            predictions={predictions}
            currentUserId={currentUserId}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function StageMatches({
  stageId,
  users,
  matches,
  predictions,
  currentUserId,
}: {
  stageId: StageId
  users: AppUser[]
  matches: Match[]
  predictions: Prediction[]
  currentUserId?: string
}) {
  const stageMatches = useMemo(
    () =>
      [...matches]
        .filter((m) => m.stage === stageId)
        .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff)),
    [matches, stageId],
  )

  if (stageMatches.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Niciun meci încărcat pentru această etapă.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {stageMatches.map((m) => (
        <MatchPredictions
          key={m.id}
          match={m}
          users={users}
          predictions={predictions}
          currentUserId={currentUserId}
        />
      ))}
    </div>
  )
}

function MatchPredictions({
  match,
  users,
  predictions,
  currentUserId,
}: {
  match: Match
  users: AppUser[]
  predictions: Prediction[]
  currentUserId?: string
}) {
  const locked = isLocked(match)
  const hasResult = match.homeScore !== null && match.awayScore !== null
  const matchPreds = predictions.filter((p) => p.matchId === match.id)

  // Sortăm participanții alfabetic; cei fără pronostic apar la final.
  const rows = useMemo(() => {
    return [...users]
      .filter((u) => u.username !== 'admin')
      .map((u) => ({
        user: u,
        pred: matchPreds.find((p) => p.userId === u.id) ?? null,
      }))
      .sort((a, b) => {
        if (!!a.pred !== !!b.pred) return a.pred ? -1 : 1
        return a.user.name.localeCompare(b.user.name, 'ro')
      })
  }, [users, matchPreds])

  return (
    <Card>
      <CardContent className="p-4">
        {/* Header meci */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TeamName
              team={match.homeTeam}
              align="right"
              className="font-heading font-bold"
            />
            {hasResult ? (
              <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-sm font-bold tabular-nums">
                {match.homeScore} - {match.awayScore}
              </span>
            ) : (
              <span className="text-muted-foreground">vs</span>
            )}
            <TeamName team={match.awayTeam} className="font-heading font-bold" />
          </div>
          <span className="text-xs text-muted-foreground">
            {formatKickoff(match.kickoff)}
          </span>
        </div>

        {/* Conținut: blocat → arată pronosticurile, altfel ascuns */}
        {!locked ? (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" />
            <span className="text-pretty">
              Pronosticurile se dezvăluie după închiderea completării pentru
              această etapă.
            </span>
          </div>
        ) : matchPreds.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Niciun pronostic înregistrat pentru acest meci.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {rows.map(({ user, pred }) => {
              const isMe = user.id === currentUserId
              const points = hasResult ? scorePrediction(pred, match) : null
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
                      'flex items-center gap-1.5 truncate text-sm',
                      isMe && 'font-bold',
                    )}
                  >
                    {user.name}
                    {isMe && (
                      <Badge className="bg-primary px-1.5 py-0 text-[10px] font-bold text-primary-foreground">
                        Tu
                      </Badge>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    {pred ? (
                      <span
                        className={cn(
                          'rounded font-mono text-sm font-bold tabular-nums',
                          exact && 'text-primary',
                          correct1x2 && 'text-accent-foreground',
                        )}
                      >
                        {pred.homeScore} - {pred.awayScore}
                      </span>
                    ) : (
                      <span className="text-xs italic text-muted-foreground">
                        fără pronostic
                      </span>
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
        )}
      </CardContent>
    </Card>
  )
}
