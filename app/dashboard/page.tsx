'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useEdition } from '@/components/edition-provider'
import {
  useMatches,
  useAllPredictions,
  useUsers,
  useCurrentAppUser,
  useUserNotifications,
} from '@/lib/hooks'
import { DeadlineBanner } from '@/components/deadline-banner'
import { MatchCard } from '@/components/match/MatchCard'
import { MatchList } from '@/components/match/MatchList'
import { StandingsTable } from '@/components/standings-table'
import { HomeResume } from '@/components/home-resume'
import { SmartActions, SmartActionIcons, type SmartAction } from '@/components/smart-actions'
import { isResumeCardEnabled, displayNameOf } from '@/lib/preferences'
import { computeLatestMatchPoints, computeRankDelta } from '@/lib/resume'
import { unreadCount as countUnread } from '@/lib/notifications-read'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getActiveMatchBatch,
  getMatchDisplayStatus,
} from '@/lib/match-display'
import { buildScheduler } from '@/lib/schedule'
import { computeStandings } from '@/lib/data'
import { ListChecks, Trophy, BarChart3, CalendarClock, Flag, ClipboardList, Radio } from 'lucide-react'
import { AchievementsSummaryCard } from '@/components/achievements-summary-card'

function getActiveMatchesTitle(
  matches: NonNullable<ReturnType<typeof getActiveMatchBatch>>,
  now: number,
) {
  const liveCount = matches.filter(
    (match) => getMatchDisplayStatus(match, now) === 'live',
  ).length

  if (liveCount > 0) return liveCount === 1 ? 'Meci LIVE' : 'Meciuri LIVE'
  return matches.length === 1 ? 'Următorul meci' : 'Următoarele meciuri'
}

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
  const [now, setNow] = useState(0)

  useEffect(() => {
    const updateNow = () => setNow(Date.now())
    updateNow()
    const timer = window.setInterval(updateNow, 30_000)
    return () => window.clearInterval(timer)
  }, [])

  // Fără polling/focus refetch; AutoSync și salvările fac mutate explicit.
  const { data: matches, isLoading } = useMatches()
  const { data: predictions } = useAllPredictions()
  const { data: users } = useUsers()

  // Scheduler-ul competiției curente: etape, termene, blocare/dezvăluire
  // (World Cup = termene fixe; Champions League = 1h înainte de primul meci).
  const scheduler = useMemo(
    () => buildScheduler(edition.id, matches ?? []),
    [edition.id, matches],
  )

  const activeStage = scheduler.getActiveStage()
  const activeDeadline = scheduler.getStageDeadline(activeStage)
  const activeStageInfo = scheduler.stages.find((s) => s.id === activeStage)
  const stageMatches = (matches ?? [])
    .filter((m) => m.stage === activeStage)
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))

  const standings = useMemo(
    () =>
      users && matches && predictions
        ? computeStandings(users, matches, predictions, undefined, {
            id: user?.id,
            isAdmin: user?.isAdmin,
          })
        : [],
    [users, matches, predictions, user?.id, user?.isAdmin],
  )
  // Etapa care se joacă efectiv acum (poate diferi de etapa „activă" pentru
  // pronosticuri, care sare la următoarea etapă imediat ce termenul expiră).
  const liveStage = scheduler.getLiveStage()
  const liveStageInfo = scheduler.stages.find((s) => s.id === liveStage)
  // Meciurile etapei în curs (cele jucate au scor, cele neîncepute arată „vs").
  const liveStageMatches = (matches ?? [])
    .filter((m) => m.stage === liveStage)
    .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
  // Clasamentul doar pe etapa live (se actualizează pe măsură ce intră scorurile).
  const stageStandings = useMemo(
    () =>
      users && matches && predictions
        ? computeStandings(users, matches, predictions, liveStage, {
            id: user?.id,
            isAdmin: user?.isAdmin,
          })
        : [],
    [users, matches, predictions, liveStage, user?.id, user?.isAdmin],
  )
  const myRow = standings.find((r) => r.userId === user?.id)
  const myRank = myRow?.rank ?? -1

  // Documentul complet al userului (cu preferințe), din lista deja încărcată —
  // fără citire suplimentară. Notificările se încarcă o singură dată pe sesiune
  // (SWR le partajează cu clopoțelul și Centrul de notificări).
  const appUser = useCurrentAppUser(user?.id)
  const { data: notifications } = useUserNotifications(user?.id)
  const showResume = isResumeCardEnabled(appUser?.preferences)
  const latest = useMemo(
    () => computeLatestMatchPoints(matches ?? [], predictions ?? [], user?.id),
    [matches, predictions, user?.id],
  )
  const rankDelta = computeRankDelta(myRank, appUser?.preferences?.lastSeenRank)
  const unread = countUnread(notifications, appUser?.preferences)

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
    (m) => !scheduler.isLocked(m) && !myPredictedMatchIds.has(m.id),
  ).length

  const activeMatches =
    now === 0 ? [] : getActiveMatchBatch(matches ?? [], now)
  const singleActiveMatch =
    activeMatches.length === 1 ? activeMatches[0] : null
  const activeMatchesTitle = getActiveMatchesTitle(activeMatches, now)
  const hasLiveActiveMatches = activeMatches.some(
    (match) => getMatchDisplayStatus(match, now) === 'live',
  )

  // HomeResume still receives the nearest future match independently of the
  // Dashboard batch, so the target's newer resume behavior remains unchanged.
  const nextMatch =
    now === 0
      ? null
      : [...(matches ?? [])]
          .filter((m) => +new Date(m.kickoff) > now)
          .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))[0] ??
        null

  // Acțiuni contextuale: afișăm doar ce e relevant pentru utilizatorul curent.
  const smartActions: SmartAction[] = []
  if (remaining > 0) {
    smartActions.push({
      href: '/predictions',
      label: `Completează pronosticuri (${remaining})`,
      icon: SmartActionIcons.predictions,
      tone: 'accent',
    })
  }
  if (playedMatches > 0) {
    smartActions.push({
      href: '/standings',
      label: 'Vezi clasamentul',
      icon: SmartActionIcons.standings,
      tone: 'primary',
    })
    smartActions.push({
      href: '/colleagues',
      label: 'Rezultate recente',
      icon: SmartActionIcons.results,
    })
  }
  smartActions.push({
    href: '/statistics',
    label: 'Statisticile mele',
    icon: SmartActionIcons.stage,
  })
  smartActions.push({
    href: '/notifications',
    label: 'Notificări',
    icon: SmartActionIcons.notifications,
    badge: unread > 0 ? String(unread) : undefined,
  })

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
            width={260}
            height={260}
            className="h-28 w-auto shrink-0 self-end object-contain drop-shadow-lg sm:h-44 lg:h-52"
            priority
          />
        </div>
      </div>

      {/* Rezumat (Faza 3) — afișat dacă utilizatorul nu l-a dezactivat */}
      {!isLoading && user && showResume && (
        <HomeResume
          userId={user.id}
          competition={competition.id}
          displayName={appUser ? displayNameOf(appUser) : user.name ?? user.username}
          editionLabel={edition.label}
          remaining={remaining}
          myRank={myRank}
          myPoints={myRow?.points ?? 0}
          rankDelta={rankDelta}
          latestPoints={latest.points}
          latestMatch={latest.match}
          nextMatch={nextMatch}
        />
      )}

      {/* Acțiuni contextuale */}
      {!isLoading && <SmartActions actions={smartActions} />}

      {/* Un singur meci activ: card navigabil + clasamentele existente. */}
      {!isLoading && singleActiveMatch && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {getMatchDisplayStatus(singleActiveMatch, now) === 'live' ? (
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-destructive" />
              </span>
            ) : (
              <CalendarClock className="size-5 text-primary" />
            )}
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
              {activeMatchesTitle}
            </h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <MatchCard
              match={singleActiveMatch}
              competition={competition.id}
              now={now}
            />
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

      {/* Kickoff-uri suprapuse: listă cronologică de carduri navigabile. */}
      {!isLoading && activeMatches.length >= 2 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            {hasLiveActiveMatches ? (
              <Radio className="size-5 text-destructive" />
            ) : (
              <CalendarClock className="size-5 text-primary" />
            )}
            <h2 className="font-heading text-lg font-bold uppercase tracking-wide">
              {activeMatchesTitle}
            </h2>
          </div>
          <div className="flex flex-col gap-3">
            {activeMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                competition={competition.id}
                now={now}
              />
            ))}
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

              <MatchList matches={liveStageMatches} edition={edition} />

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

      {/* Achievements summary card */}
      {!isLoading && <AchievementsSummaryCard />}

      {/* Nav cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <NavCard
          href="/predictions"
          title="Scorurile mele"
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
