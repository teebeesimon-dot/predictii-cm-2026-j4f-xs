'use client'

import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { useEffect, useState } from 'react'
import { useAuth } from '@/components/auth-provider'
import { useEdition } from '@/components/edition-provider'
import { useAllPredictions, useMatches, useUsers } from '@/lib/hooks'
import { usersForEdition } from '@/lib/data'
import { buildScheduler } from '@/lib/schedule'
import { isDedicatedAdmin, isViewOnly, scorePrediction, type AppUser, type Match, type Prediction } from '@/lib/types'
import { formatKickoff } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarClock, ChevronLeft, Lock, PencilLine, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

const LIVE_WINDOW_MS = 2.5 * 60 * 60 * 1000

function liveMinute(kickoff: string) {
  const elapsed = Math.max(1, Math.floor((Date.now() - new Date(kickoff).getTime()) / 60000))
  return `${Math.min(elapsed, 120)}'`
}

export default function MatchDetails({ matchId }: { matchId: string }) {
  const { user } = useAuth()
  const { edition } = useEdition()
  const { data: matches, isLoading: matchesLoading } = useMatches(30000)
  const { data: predictions, isLoading: predictionsLoading } = useAllPredictions()
  const [, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000)
    return () => window.clearInterval(timer)
  }, [])
  const { data: users, isLoading: usersLoading } = useUsers()

  const match = matches?.find((item) => item.id === matchId)
  const isLive = !!match && Date.now() >= new Date(match.kickoff).getTime() && Date.now() - new Date(match.kickoff).getTime() <= LIVE_WINDOW_MS
  const scheduler = match ? buildScheduler(edition.id, matches ?? []) : null
  const activeUsers = users ? usersForEdition(users, edition.id) : []
  const matchPredictions = predictions?.filter((prediction) => prediction.matchId === matchId) ?? []
  const revealed = !!match && (isLive || scheduler?.isLocked(match))
  const rows = activeUsers
    .filter((participant) => !isViewOnly(participant) && !isDedicatedAdmin(participant))
    .map((participant) => ({
      user: participant,
      prediction: matchPredictions.find((item) => item.userId === participant.id) ?? null,
    }))
    .sort((a, b) => {
      if (!!a.prediction !== !!b.prediction) return a.prediction ? -1 : 1
      return a.user.name.localeCompare(b.user.name, 'ro')
    })

  return (
    <AppShell>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Înapoi la Acasă
        </Link>

        {(matchesLoading || usersLoading || predictionsLoading) && (
          <p className="text-sm text-muted-foreground">Se încarcă meciul...</p>
        )}

        {!matchesLoading && !match && (
          <Card>
            <CardContent className="flex flex-col gap-3 p-6">
              <CardTitle>Meciul nu a fost găsit</CardTitle>
              <p className="text-sm text-muted-foreground">Meciul nu aparține competiției selectate sau nu mai este disponibil.</p>
            </CardContent>
          </Card>
        )}

        {match && (
          <Card className={cn('overflow-hidden', isLive ? 'border-destructive/50' : 'border-primary/30')}>
            <CardHeader className="gap-4 border-b border-border bg-card/80">
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">{edition.label}</Badge>
                {isLive ? (
                  <Badge className="gap-1 bg-destructive text-destructive-foreground">
                    <Radio className="size-3" />
                    Live {liveMinute(match.kickoff)}
                  </Badge>
                ) : match.homeScore !== null && match.awayScore !== null ? (
                  <Badge variant="secondary">Final</Badge>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarClock className="size-3.5" />
                    {formatKickoff(match.kickoff)}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-center gap-3 text-center sm:gap-6">
                <span className="min-w-0 flex-1 font-heading text-lg font-bold sm:text-2xl">{match.homeTeam}</span>
                <span className="shrink-0 rounded-lg bg-secondary px-3 py-1 font-mono text-xl font-bold tabular-nums sm:text-2xl">
                  {match.homeScore !== null && match.awayScore !== null ? `${match.homeScore} - ${match.awayScore}` : 'vs'}
                </span>
                <span className="min-w-0 flex-1 font-heading text-lg font-bold sm:text-2xl">{match.awayTeam}</span>
              </div>
              {isLive && <p className="text-center text-xs font-medium uppercase tracking-widest text-destructive">Scor live · minutul {liveMinute(match.kickoff)}</p>}
            </CardHeader>

            <CardContent className="flex flex-col gap-4 p-4 sm:p-6">
              {!revealed ? (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-4 text-sm text-muted-foreground">
                  <Lock className="size-4 shrink-0" />
                  Pronosticurile se afișează după ce începe meciul sau după închiderea etapei.
                </div>
              ) : rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nu există participanți activi la această competiție.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h1 className="font-heading text-lg font-bold">Pronosticurile participanților</h1>
                    <span className="text-xs text-muted-foreground">{rows.length} jucători</span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {rows.map(({ user: participant, prediction }) => {
                      const points = match.homeScore !== null && match.awayScore !== null ? scorePrediction(prediction, match) : null
                      return (
                        <li key={participant.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
                          <span className="truncate text-sm font-medium">{participant.name}</span>
                          <span className="flex items-center gap-2">
                            {prediction ? (
                              <span className={cn('font-mono text-sm font-bold tabular-nums', points === 3 && 'text-primary', points === 1 && 'text-accent')}>
                                {prediction.homeScore} - {prediction.awayScore}
                              </span>
                            ) : (
                              <span className="text-xs italic text-muted-foreground">fără pronostic</span>
                            )}
                            {prediction?.editedByAdmin && (
                              <Badge variant="secondary" className="gap-1 px-1.5 py-0 text-[10px]">
                                <PencilLine className="size-3" /> Admin
                              </Badge>
                            )}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </AppShell>
  )
}
