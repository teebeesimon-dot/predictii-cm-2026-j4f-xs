'use client'

import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useAllPredictions, useUsers } from '@/lib/hooks'
import { DeadlineBanner } from '@/components/deadline-banner'
import { TeamName } from '@/components/team-name'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { STAGES, getActiveStage, getStageDeadline, isLocked } from '@/lib/types'
import { computeStandings } from '@/lib/data'
import { ListChecks, Trophy, BarChart3, CalendarClock, Flag, Lock, ClipboardList } from 'lucide-react'

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
      ? computeStandings(users, matches, predictions, undefined, {
          id: user?.id,
          isAdmin: user?.isAdmin,
        })
      : []
  const myRow = standings.find((r) => r.userId === user?.id)
  const myRank = myRow?.rank ?? -1

  const totalMatches = matches?.length ?? 0
  const playedMatches = (matches ?? []).filter(
    (m) => m.homeScore !== null && m.awayScore !== null,
  ).length

  // Pronosticuri rămase pentru ETAPA ACTIVĂ: meciuri din etapa curentă care nu
  // sunt încă blocate (termenul nu a trecut) ȘI pentru care utilizatorul nu are
  // deja un pronostic salvat. Restrângem la etapa activă ca să nu numărăm
  // meciurile din etapele viitoare (ex. după ce completezi Etapa 1, nu mai
  // apar cele 48 din etapele 2 și 3).
  const myPredictedMatchIds = new Set(
    (predictions ?? [])
      .filter((p) => p.userId === user?.id)
      .map((p) => p.matchId),
  )
  const remaining = stageMatches.filter(
    (m) => !isLocked(m) && !myPredictedMatchIds.has(m.id),
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

      {/* Current stage + deadline countdown */}
      <Card className="overflow-hidden border-primary/30">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            <CardTitle className="text-base">
              {activeStageInfo?.name ?? 'Etapa curentă'}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {activeStageInfo?.label}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="flex flex-col gap-5">
              <DeadlineBanner
                deadline={activeDeadline}
                label="Pronosticurile se închid în"
              />

              {stageMatches.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Flag className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Meciurile acestei etape nu au fost adăugate încă.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {stageMatches.map((m) => {
                    const locked = isLocked(m)
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm"
                      >
                        <TeamName
                          team={m.homeTeam}
                          align="right"
                          className="flex-1 justify-end font-medium"
                        />
                        <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                          {m.homeScore !== null && m.awayScore !== null
                            ? `${m.homeScore} - ${m.awayScore}`
                            : 'vs'}
                        </span>
                        <TeamName
                          team={m.awayTeam}
                          className="flex-1 font-medium"
                        />
                        {locked && (
                          <Lock className="size-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}

              <Link
                href="/predictions"
                className={buttonVariants({
                  className: 'w-full sm:w-auto sm:self-center',
                })}
              >
                <ListChecks className="size-4" />
                Completează pronosticurile
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pronosticuri rămase */}
      {!isLoading && totalMatches > 0 && (
        <Card
          className={
            remaining > 0
              ? 'border-accent/40 bg-accent/5'
              : 'border-primary/30 bg-primary/5'
          }
        >
          <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className={
                  'flex size-11 shrink-0 items-center justify-center rounded-xl ' +
                  (remaining > 0
                    ? 'bg-accent/15 text-accent'
                    : 'bg-primary/15 text-primary')
                }
              >
                <ClipboardList className="size-5" />
              </div>
              <div>
                <p className="font-heading text-lg font-bold">
                  {remaining > 0
                    ? `Mai ai ${remaining} ${remaining === 1 ? 'pronostic' : 'pronosticuri'} de completat la ${activeStageInfo?.name ?? 'etapa curentă'}`
                    : `Ești la zi cu ${activeStageInfo?.name ?? 'etapa curentă'}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {remaining > 0
                    ? 'Completează-le înainte de termenul limită al etapei.'
                    : 'Toate meciurile din această etapă au pronostic.'}
                </p>
              </div>
            </div>
            {remaining > 0 && (
              <Link
                href="/predictions"
                className={buttonVariants({ className: 'w-full sm:w-auto' })}
              >
                <ListChecks className="size-4" />
                Completează acum
              </Link>
            )}
          </CardContent>
        </Card>
      )}

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
