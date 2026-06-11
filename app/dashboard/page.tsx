'use client'

import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useAllPredictions, useUsers } from '@/lib/hooks'
import { DeadlineBanner } from '@/components/deadline-banner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { STAGES, getActiveStage, getStageDeadline, isLocked, type StageId } from '@/lib/types'
import { computeStandings } from '@/lib/data'
import { formatKickoff } from '@/lib/utils'
import { ListChecks, Trophy, BarChart3, CalendarClock, Flag, Lock } from 'lucide-react'

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const { data: matches, isLoading } = useMatches()
  const { data: predictions } = useAllPredictions()
  const { data: users } = useUsers()

  const activeStage = getActiveStage()
  const activeDeadline = getStageDeadline(activeStage)
  const activeStageInfo = STAGES.find((s) => s.id === activeStage)
  const stageMatches = (matches ?? [])
    .filter((m) => m.stage === activeStage)
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))

  const standings =
    users && matches && predictions
      ? computeStandings(users, matches, predictions)
      : []
  const myRow = standings.find((r) => r.userId === user?.id)
  const myRank = myRow?.rank ?? -1

  const totalMatches = matches?.length ?? 0
  const playedMatches = (matches ?? []).filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  ).length

  return (
    <div className="flex flex-col gap-6">
      {/* Hero welcome banner */}
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/stadium-night.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="relative flex flex-col gap-1 p-6 sm:p-8">
          <p className="text-sm font-medium uppercase tracking-widest text-accent">
            Bun venit
          </p>
          <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {user?.name ?? user?.username}
          </h1>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Iată ce urmează în Campionatul Mondial 2026. Pune-ți pronosticurile
            și urcă în clasament.
          </p>
        </div>
      </div>

      {/* Next match */}
      <Card className="overflow-hidden border-primary/30">
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <CalendarClock className="size-5 text-primary" />
          <CardTitle className="text-base">Următorul meci</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-28 w-full" />
          ) : next ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-center">
                  <p className="font-heading text-lg font-bold sm:text-2xl">
                    {next.homeTeam}
                  </p>
                </div>
                <div className="flex flex-col items-center">
                  <span className="font-heading text-sm font-bold text-muted-foreground">
                    VS
                  </span>
                </div>
                <div className="flex-1 text-center">
                  <p className="font-heading text-lg font-bold sm:text-2xl">
                    {next.awayTeam}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
                <Badge variant="secondary">
                  {STAGES.find((s) => s.id === next.stage)?.name}
                </Badge>
                <span>{formatKickoff(next.kickoff)}</span>
              </div>
              <div className="flex justify-center">
                <Countdown kickoff={next.kickoff} />
              </div>
              <Button asChild className="w-full sm:w-auto sm:self-center">
                <Link href="/predictions">
                  <ListChecks className="size-4" />
                  Pune pronosticul
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Flag className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nu există meciuri programate momentan.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Locul tău"
          value={myRank > 0 ? `#${myRank}` : '-'}
          icon={Trophy}
        />
        <StatCard
          label="Punctele tale"
          value={myRow ? String(myRow.points) : '0'}
          icon={BarChart3}
        />
        <StatCard
          label="Meciuri jucate"
          value={`${playedMatches}/${totalMatches}`}
          icon={Flag}
        />
        <StatCard
          label="Scoruri exacte"
          value={myRow ? String(myRow.exact) : '0'}
          icon={ListChecks}
        />
      </div>

      {/* Nav cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard
          href="/predictions"
          title="Pronosticuri"
          desc="Completează scorurile meciurilor"
          icon={ListChecks}
        />
        <NavCard
          href="/standings"
          title="Clasamente"
          desc="General și pe etape"
          icon={Trophy}
        />
        <NavCard
          href="/statistics"
          title="Statistici"
          desc="Precizia pronosticurilor tale"
          icon={BarChart3}
        />
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: string
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="font-heading text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function NavCard({
  href,
  title,
  desc,
  icon: Icon,
}: {
  href: string
  title: string
  desc: string
  icon: React.ElementType
}) {
  return (
    <Link href={href}>
      <Card className="group h-full transition-colors hover:border-primary/50 hover:bg-secondary/40">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <Icon className="size-5" />
          </div>
          <div>
            <p className="font-semibold">{title}</p>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
