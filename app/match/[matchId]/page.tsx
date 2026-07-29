'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Lock, Trophy, Users } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { MatchCard } from '@/components/match/MatchCard'
import { MatchPredictionsList } from '@/components/match/MatchPredictionsList'
import { StandingsTable } from '@/components/standings-table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuth } from '@/components/auth-provider'
import { useEdition } from '@/components/edition-provider'
import { useAllPredictions, useMatches, useUsers } from '@/lib/hooks'
import { computeStandings } from '@/lib/data'
import { buildScheduler } from '@/lib/schedule'

export default function MatchCenterPage() {
  return (
    <AppShell>
      <MatchCenterContent />
    </AppShell>
  )
}

function MatchCenterContent() {
  const [now, setNow] = useState(0)
  const params = useParams<{ matchId: string }>()
  const matchId = params.matchId
  const { user } = useAuth()
  const { edition, competition } = useEdition()
  const { data: matches, isLoading: matchesLoading } = useMatches()
  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: predictions, isLoading: predictionsLoading } =
    useAllPredictions()

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()
    const timer = window.setInterval(updateNow, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const loading = matchesLoading || usersLoading || predictionsLoading
  const match = matches?.find((item) => item.id === matchId)

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    )
  }

  if (!match || !matches || !users || !predictions) {
    return (
      <div className="flex flex-col gap-4">
        <Link
          href="/dashboard"
          className={buttonVariants({
            variant: 'ghost',
            className: 'w-fit',
          })}
        >
          <ArrowLeft className="size-4" />
          Înapoi la Dashboard
        </Link>
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="font-heading text-xl font-bold">
              Meciul nu a fost găsit
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Meciul nu aparține ediției {edition.label} sau nu mai este
              disponibil.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scheduler = buildScheduler(edition.id, matches)
  const predictionsVisible = now > 0 && scheduler.isLocked(match)
  const viewer = {
    id: user?.id,
    isAdmin: user?.isAdmin,
  }
  const stageStandings = computeStandings(
    users,
    matches,
    predictions,
    match.stage,
    viewer,
  )
  const overallStandings = computeStandings(
    users,
    matches,
    predictions,
    undefined,
    viewer,
  )
  const stageInfo = scheduler.stages.find((stage) => stage.id === match.stage)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className={buttonVariants({
            variant: 'ghost',
            className: 'w-fit',
          })}
        >
          <ArrowLeft className="size-4" />
          Înapoi la Dashboard
        </Link>
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            {edition.label}
          </p>
          <h1 className="font-heading text-3xl font-bold">Centrul meciului</h1>
        </div>
      </div>

      <MatchCard
        match={match}
        competition={competition.id}
        variant="detail"
        clickable={false}
        now={now}
      />

      <Card className="border-primary/30">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <CardTitle className="text-base">Scorurile tuturor</CardTitle>
          </div>
          <Badge variant="secondary">{stageInfo?.short}</Badge>
        </CardHeader>
        <CardContent>
          {!predictionsVisible ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-10 text-center text-muted-foreground">
              <Lock className="size-8" />
              <p className="text-pretty text-sm font-medium">
                Scorurile tuturor devin vizibile după închiderea etapei.
              </p>
            </div>
          ) : (
            <MatchPredictionsList
              match={match}
              users={users}
              predictions={predictions}
              currentUserId={user?.id}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-primary/30">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <CardTitle className="text-base">Clasament etapă</CardTitle>
            </div>
            <Badge variant="secondary">{stageInfo?.short}</Badge>
          </CardHeader>
          <CardContent>
            <StandingsTable
              rows={stageStandings}
              highlightUserId={user?.id}
            />
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <div className="flex items-center gap-2">
              <Trophy className="size-5 text-primary" />
              <CardTitle className="text-base">Clasament general</CardTitle>
            </div>
            <Badge variant="secondary">General</Badge>
          </CardHeader>
          <CardContent>
            <StandingsTable
              rows={overallStandings}
              highlightUserId={user?.id}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
