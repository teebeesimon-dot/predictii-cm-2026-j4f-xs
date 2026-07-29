'use client'

import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { MatchCard } from '@/components/match/MatchCard'
import { MatchPredictionsList } from '@/components/match/MatchPredictionsList'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import { useEdition } from '@/components/edition-provider'
import { buildScheduler, type Scheduler } from '@/lib/schedule'
import {
  type StageId,
  type Match,
  type Prediction,
  type AppUser,
} from '@/lib/types'
import { cn } from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Lock } from 'lucide-react'

export default function ColleaguesPage() {
  return (
    <AppShell>
      <ColleaguesContent />
    </AppShell>
  )
}

function ColleaguesContent() {
  const { user } = useAuth()
  const { editionId } = useEdition()
  const searchParams = useSearchParams()
  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()
  const selectedMatchId = searchParams.get('match')

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions
  // Scheduler-ul competiției curente: decide etapele și când se dezvăluie
  // pronosticurile (World Cup = termene fixe; Champions League = 1h înainte
  // de primul meci al etapei).
  const scheduler = buildScheduler(editionId, matches ?? [])

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Scorurile tuturor</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Vezi scorul ales de fiecare participant. Scorurile unui meci se
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
          scheduler={scheduler}
          selectedMatchId={selectedMatchId}
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
  scheduler,
  selectedMatchId,
}: {
  users: AppUser[]
  matches: Match[]
  predictions: Prediction[]
  currentUserId?: string
  scheduler: Scheduler
  selectedMatchId: string | null
}) {
  const stages = scheduler.stages
  // Prima etapă care are meciuri devine tab-ul implicit.
  const stagesWithMatches = stages.filter((s) =>
    matches.some((m) => m.stage === s.id),
  )
  const selectedMatch = matches.find((match) => match.id === selectedMatchId)
  const defaultTab = String(
    selectedMatch?.stage ?? stagesWithMatches[0]?.id ?? stages[0]?.id ?? 1,
  )

  useEffect(() => {
    if (!selectedMatchId) return
    requestAnimationFrame(() => {
      document
        .getElementById(`match-${selectedMatchId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [selectedMatchId])

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-transparent p-0">
        {stages.map((s) => (
          <TabsTrigger
            key={s.id}
            value={String(s.id)}
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            {s.name}
          </TabsTrigger>
        ))}
      </TabsList>

      {stages.map((s) => (
        <TabsContent key={s.id} value={String(s.id)} className="mt-4">
          <StageMatches
            stageId={s.id}
            users={users}
            matches={matches}
            predictions={predictions}
            currentUserId={currentUserId}
            scheduler={scheduler}
            selectedMatchId={selectedMatchId}
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
  scheduler,
  selectedMatchId,
}: {
  stageId: StageId
  users: AppUser[]
  matches: Match[]
  predictions: Prediction[]
  currentUserId?: string
  scheduler: Scheduler
  selectedMatchId: string | null
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
          scheduler={scheduler}
          selected={m.id === selectedMatchId}
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
  scheduler,
  selected,
}: {
  match: Match
  users: AppUser[]
  predictions: Prediction[]
  currentUserId?: string
  scheduler: Scheduler
  selected: boolean
}) {
  const locked = scheduler.isLocked(match)

  return (
    <div
      id={`match-${match.id}`}
      className={cn(
        'rounded-xl',
        selected && 'ring-1 ring-primary/30',
      )}
    >
      <MatchCard match={match} competition={scheduler.competitionId}>
        {!locked ? (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-3 text-sm text-muted-foreground">
            <Lock className="size-4 shrink-0" />
            <span className="text-pretty">
              Scorurile se dezvăluie după închiderea completării pentru
              această etapă.
            </span>
          </div>
        ) : (
          <MatchPredictionsList
            match={match}
            users={users}
            predictions={predictions}
            currentUserId={currentUserId}
          />
        )}
      </MatchCard>
    </div>
  )
}
