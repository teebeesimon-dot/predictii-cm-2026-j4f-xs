'use client'

import Link from 'next/link'
import Image from 'next/image'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useEdition } from '@/components/edition-provider'
import { useMatches, useAllPredictions, useUsers } from '@/lib/hooks'
import { DeadlineBanner } from '@/components/deadline-banner'
import { TeamName } from '@/components/team-name'
import { StandingsTable } from '@/components/standings-table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  STAGES,
  getActiveStage,
  getLiveStage,
  getStageDeadline,
  isLocked,
  isViewOnly,
  scorePrediction,
  type Match,
  type Prediction,
  type AppUser,
} from '@/lib/types'
import { computeStandings } from '@/lib/data'
import { cn, formatKickoff } from '@/lib/utils'
import { ListChecks, Trophy, BarChart3, CalendarClock, Flag, Lock, ClipboardList, Radio, CheckCircle2 } from 'lucide-react'

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  )
}

function DashboardContent() {
  const { user } = useAuth()
  const { edition, competition } = useEdition()
  // Reîmprospătare automată în fundal la 10s, fără reîncărcarea paginii.
  // SWR revalidează datele și actualizează doar ce s-a schimbat (scoruri,
  // pronosticuri, clasament), păstrând starea și scroll-ul.
  const { data: matches, isLoading } = useMatches(10_000)
  const { data: predictions } = useAllPredictions(10_000)
  const { data: users } = useUsers(10_000)

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
  // Etapa care se joacă efectiv acum (poate diferi de etapa „activă" pentru
  // pronosticuri, care sare la următoarea etapă imediat ce termenul expiră).
  const liveStage = getLiveStage(matches ?? [])
  const liveStageInfo = STAGES.find((s) => s.id === liveStage)
  // Meciurile etapei în curs (cele jucate au scor, cele neîncepute arată „vs").
  const liveStageMatches = (matches ?? [])
    .filter((m) => m.stage === liveStage)
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
  // Clasamentul doar pe etapa live (se actualizează pe măsură ce intră scorurile).
  const stageStandings =
    users && matches && predictions
      ? computeStandings(users, matches, predictions, liveStage, {
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

  // Meciuri „în desfășurare": au început (kickoff a trecut) și sunt în fereastra
  // de ~2,5 ore de la start. Rămân afișate chiar dacă adminul a introdus deja un
  // scor live. Sunt afișate primele, în stilul paginii „Colegi", cu
  // pronosticurile tuturor.
  const now = Date.now()
  const LIVE_WINDOW_MS = 2.5 * 60 * 60 * 1000
  const liveMatches = (matches ?? [])
    .filter((m) => {
      const ko = +new Date(m.kickoff)
      return ko <= now && now - ko <= LIVE_WINDOW_MS
    })
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))

  // Următorul meci: cel mai apropiat meci din viitor (kickoff încă nu a trecut).
  // Folosit doar când nu există niciun meci în desfășurare.
  const nextMatch =
    [...(matches ?? [])]
      .filter((m) => +new Date(m.kickoff) > now)
      .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))[0] ?? null

  return (
    <div className="flex flex-col gap-6">
      {/* Hero welcome banner — deasupra a tot */}
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/stadium-night.png')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        <div className="relative flex items-center justify-between gap-4 p-6 sm:p-8">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium uppercase tracking-widest text-accent">
              Bun venit
            </p>
            <h1 className="font-heading text-3xl font-bold text-foreground sm:text-4xl">
              {user?.name ?? user?.username}
            </h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {`Iată ce urmează în ${edition.label}. Pune-ți pronosticurile și urcă în clasament.`}
            </p>
          </div>
          <Image
            src={competition.mascot || '/placeholder.svg'}
            alt={`Mascota ${competition.name}`}
            width={220}
            height={220}
            className="hidden size-36 shrink-0 object-contain drop-shadow-lg sm:block lg:size-44"
            priority
          />
        </div>
      </div>

      {/* Meci în desfășurare — afișat primul, split: pronosticuri + clasament live */}
      {!isLoading && liveMatches.length > 0 && users && predictions && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
            </span>
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
              Se joacă acum
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Stânga: meciul/meciurile live cu pronosticurile tuturor */}
            <div className="flex flex-col gap-3">
              {liveMatches.map((m) => (
                <LiveMatchCard
                  key={m.id}
                  match={m}
                  users={users}
                  predictions={predictions}
                  currentUserId={user?.id}
                />
              ))}
            </div>
            {/* Dreapta: mai întâi clasamentul live pe etapa curentă, apoi cel general */}
            <div className="flex flex-col gap-4">
              <Card className="border-destructive/30">
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-destructive" />
                    <CardTitle className="text-base">Clasament live etapă</CardTitle>
                  </div>
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {liveStageInfo?.short}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <StandingsTable rows={stageStandings} highlightUserId={user?.id} />
                </CardContent>
              </Card>
              <Card className="border-primary/30">
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-primary" />
                    <CardTitle className="text-base">Clasament general</CardTitle>
                  </div>
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    General
                  </Badge>
                </CardHeader>
                <CardContent>
                  <StandingsTable rows={standings} highlightUserId={user?.id} />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}
      {/* Niciun meci live → următorul meci + clasament, în același layout split */}
      {!isLoading && liveMatches.length === 0 && nextMatch && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
              Următorul meci
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Stânga: următorul meci cu pronosticurile tuturor */}
            <LiveMatchCard
              match={nextMatch}
              users={users ?? []}
              predictions={predictions ?? []}
              currentUserId={user?.id}
              variant="next"
            />
            {/* Dreapta: mai întâi clasamentul pe etapa curentă, apoi cel general */}
            <div className="flex flex-col gap-4">
              <Card className="border-primary/30">
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-primary" />
                    <CardTitle className="text-base">Clasament etapă</CardTitle>
                  </div>
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    {liveStageInfo?.short}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <StandingsTable rows={stageStandings} highlightUserId={user?.id} />
                </CardContent>
              </Card>
              <Card className="border-primary/30">
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <div className="flex items-center gap-2">
                    <Trophy className="size-5 text-primary" />
                    <CardTitle className="text-base">Clasament general</CardTitle>
                  </div>
                  <Badge variant="secondary" className="hidden sm:inline-flex">
                    General
                  </Badge>
                </CardHeader>
                <CardContent>
                  <StandingsTable rows={standings} highlightUserId={user?.id} />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}
      {/* Current stage + deadline countdown */}
      <Card className="overflow-hidden border-primary/30">
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" />
            <CardTitle className="text-base">
              {liveStageInfo?.name ?? 'Etapa curentă'}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {liveStageInfo?.label}
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

              {liveStageMatches.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <Flag className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Meciurile acestei etape nu au fost adăugate încă.
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col divide-y divide-border rounded-lg border border-border">
                  {liveStageMatches.map((m) => {
                    const locked = isLocked(m)
                    return (
                      <li
                        key={m.id}
                        className="flex flex-col gap-1 px-3 py-2.5 text-sm"
                      >
                        <div className="flex items-center gap-3">
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
                        </div>
                        <span className="text-center text-xs capitalize text-muted-foreground">
                          {formatKickoff(m.kickoff)}
                        </span>
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

function LiveMatchCard({
  match,
  users,
  predictions,
  currentUserId,
  variant = 'live',
}: {
  match: Match
  users: AppUser[]
  predictions: Prediction[]
  currentUserId?: string
  variant?: 'live' | 'next'
}) {
  // Pronosticurile se dezvăluie doar după ce meciul e blocat (a început sau a
  // trecut termenul limită), exact ca pe pagina „Colegi". Un meci live este
  // mereu blocat; pentru următorul meci, dezvăluim doar dacă deja e blocat.
  const hasResult = match.homeScore !== null && match.awayScore !== null
  const revealed = variant === 'live' || isLocked(match)
  const matchPreds = predictions.filter((p) => p.matchId === match.id)

  const rows = [...users]
    .filter(
      (u) =>
        !isViewOnly(u) &&
        u.username !== 'admin' &&
        (u.name ?? '').toLowerCase() !== 'administrator',
    )
    .map((u) => ({
      user: u,
      pred: matchPreds.find((p) => p.userId === u.id) ?? null,
    }))
    .sort((a, b) => {
      if (!!a.pred !== !!b.pred) return a.pred ? -1 : 1
      return a.user.name.localeCompare(b.user.name, 'ro')
    })

  return (
    <Card className={variant === 'live' ? 'border-destructive/40' : 'border-primary/30'}>
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
          {variant === 'live' ? (
            <Badge className="gap-1 bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase text-destructive-foreground">
              <Radio className="size-3" />
              Live
            </Badge>
          ) : (
            <span className="flex items-center gap-1 text-xs capitalize text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {formatKickoff(match.kickoff)}
            </span>
          )}
        </div>

        {!revealed ? (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-4" />
            Pronosticurile se afișează după ce începe meciul.
          </p>
        ) : matchPreds.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Niciun pronostic înregistrat pentru acest meci.
          </p>
        ) : (
          <ul className="mt-3 grid grid-cols-1 gap-1.5">
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
                          correct1x2 && 'text-accent',
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
