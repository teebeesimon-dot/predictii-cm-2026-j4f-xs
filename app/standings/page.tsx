'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions, useGroups, useLeaderboardSummaries } from '@/lib/hooks'
import { useEdition } from '@/components/edition-provider'
import { auth } from '@/lib/firebase'
import {
  computeStandings,
  computePositionHistory,
  type StandingsViewer,
} from '@/lib/data'
import { hasEditionAccess, isViewOnly, isDedicatedAdmin, type AppUser, type Match, type Prediction } from '@/lib/types'
import { type StageId } from '@/lib/types'
import { stagesForEdition, type StageDef } from '@/lib/stages'
import {
  buildUserGroupsMap,
  filterStandingRowsByGroups,
  memberIdsForSelectedGroups,
} from '@/lib/groups'
import { cn } from '@/lib/utils'
import { StandingsTable } from '@/components/standings-table'
import { GroupsFilter } from '@/components/groups/groups-filter'
import { PositionEvolutionChart } from '@/components/position-evolution-chart'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function StandingsPage() {
  return (
    <AppShell>
      <StandingsContent />
    </AppShell>
  )
}

function StandingsContent() {
  const { user } = useAuth()
  const { editionId } = useEdition()
  const stages = stagesForEdition(editionId)
  const searchParams = useSearchParams()
  const stageParam = searchParams.get('stage')
  const initialTab =
    stageParam && stages.some((s) => String(s.id) === stageParam)
      ? stageParam
      : 'general'

  const useAggregates = Boolean(auth.currentUser)
  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [hasLiveMatchWindow, setHasLiveMatchWindow] = useState(false)

  // Actualizeaza local starea ferestrei live; nu face citiri de retea.
  // Fereastra este aceeasi folosita de AutoSync: 5 min inainte pana la 3 ore dupa start.
  useEffect(() => {
    if (!matches?.length) {
      setHasLiveMatchWindow(false)
      return
    }
    const updateWindow = () => {
      const now = Date.now()
      setHasLiveMatchWindow(matches.some((match) => {
        const kickoff = new Date(match.kickoff).getTime()
        return Number.isFinite(kickoff) && now >= kickoff - 5 * 60 * 1000 && now <= kickoff + 3 * 60 * 60 * 1000
      }))
    }
    updateWindow()
    const timer = window.setInterval(updateWindow, 30 * 1000)
    return () => window.clearInterval(timer)
  }, [matches])
  const { data: predictions, isLoading: l3 } = useAllPredictions(undefined, activeTab === 'evolution' || !useAggregates)
  const { data: summaries, isLoading: l4 } = useLeaderboardSummaries(useAggregates, hasLiveMatchWindow ? 30 * 1000 : 0)
  const { data: groups = [] } = useGroups()

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

  const loading = l1 || l2 || (useAggregates ? l4 : l3)
  const ready = users && matches && (useAggregates ? summaries : predictions)
  const userGroups = useMemo(() => buildUserGroupsMap(groups), [groups])
  const groupMemberIds = useMemo(
    () =>
      memberIdsForSelectedGroups(
        groups,
        groups.map((group) => group.id),
      ) ?? new Set<string>(),
    [groups],
  )
  const canViewGeneral =
    user?.isAdmin === true || (user?.id ? groupMemberIds.has(user.id) : false)
  const viewer: StandingsViewer = {
    id: user?.id,
    isAdmin: user?.isAdmin,
    editionId,
    allowedUserIds: user?.isAdmin ? undefined : groupMemberIds,
  }

  function rowsFor(stage?: StageId) {
    if (!ready) return []
    if (!useAggregates) {
      if (!predictions) return []
      return filterStandingRowsByGroups(
        computeStandings(users, matches, predictions, stage, viewer),
        groups,
        selectedGroupIds,
      )
    }
    const rows = users
      .filter((u) => !isDedicatedAdmin(u) && !isViewOnly(u))
      .filter((u) => hasEditionAccess(u, editionId))
      .filter((u) => !viewer.allowedUserIds || viewer.allowedUserIds.has(u.id))
      .filter((u) => !u.hideFromStandings || viewer.isAdmin === true || viewer.id === u.id)
      .filter((u) => (summaries?.find((item) => item.userId === u.id)?.predictionsCount ?? 0) > 0)
      .map((u) => {
        const summary = summaries?.find((item) => item.userId === u.id)
        const totals = stage === undefined
          ? summary
          : summary?.stages?.[String(stage)]
        return {
          userId: u.id, username: u.username, name: u.name || u.username,
          points: totals?.points ?? 0, exact: totals?.exact ?? 0,
          correct1x2: totals?.correct1x2 ?? 0, played: totals?.played ?? 0,
          predicted: totals?.played ?? 0, rank: 0,
        }
      })
      .sort((a, b) => b.points - a.points || b.exact - a.exact || b.correct1x2 - a.correct1x2 || a.name.localeCompare(b.name))
    let lastPoints: number | null = null
    let lastRank = 0
    const ranked = rows.map((row, index) => {
      const rank = lastPoints !== null && row.points === lastPoints ? lastRank : index + 1
      if (lastPoints === null || row.points !== lastPoints) { lastPoints = row.points; lastRank = rank }
      return { ...row, rank }
    })
    return filterStandingRowsByGroups(ranked, groups, selectedGroupIds)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Clasamente</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            General și pe fiecare etapă a turneului. Egalitățile împart aceeași
            poziție.
          </p>
        </div>
        <GroupsFilter
          groups={groups}
          selectedGroupIds={selectedGroupIds}
          onChange={setSelectedGroupIds}
        />
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {!loading && useAggregates && summaries?.length === 0 && user?.isAdmin ? (
            <p className="mb-4 rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
              Statisticile agregate nu au fost initializate pentru aceasta editie. Intra in Administrare, apoi Sincronizare si ruleaza „Reconstruieste statisticile editiei”.
            </p>
          ) : null}
          {loading || !ready ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="flex w-full flex-wrap">
                <TabsTrigger value="general" className="flex-1">
                  General
                </TabsTrigger>
                {stages.map((s) => (
                  <TabsTrigger key={s.id} value={String(s.id)} className="flex-1">
                    {s.short}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="evolution" className="flex-1">
                  Evoluție
                </TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="mt-4">
                {canViewGeneral ? (
                  <StandingsTable
                    rows={rowsFor(undefined)}
                    highlightUserId={user?.id}
                    userGroups={userGroups}
                  />
                ) : (
                  <p className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                    Clasamentul general este disponibil doar participanților
                    înscriși într-o grupă a acestei ediții.
                  </p>
                )}
              </TabsContent>

              {stages.map((s) => (
                <TabsContent key={s.id} value={String(s.id)} className="mt-4">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    {s.label}
                  </p>
                  <StandingsTable
                    rows={rowsFor(s.id as StageId)}
                    highlightUserId={user?.id}
                    userGroups={userGroups}
                  />
                </TabsContent>
              ))}

              <TabsContent value="evolution" className="mt-4">
                {predictions ? (
                  <EvolutionTab
                    users={users}
                    matches={matches}
                    predictions={predictions}
                    viewer={viewer}
                    highlightUserId={user?.id}
                    stages={stages}
                    selectedGroupIds={selectedGroupIds}
                    groups={groups}
                  />
                ) : (
                  <Skeleton className="h-64 w-full" />
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function EvolutionTab({
  users,
  matches,
  predictions,
  viewer,
  highlightUserId,
  stages,
  selectedGroupIds,
  groups,
}: {
  users: AppUser[]
  matches: Match[]
  predictions: Prediction[]
  viewer: StandingsViewer
  highlightUserId?: string
  stages: StageDef[]
  selectedGroupIds: string[]
  groups: import('@/lib/types').Group[]
}) {
  const [scope, setScope] = useState<'general' | StageId>('general')

  const scopes: { key: 'general' | StageId; label: string }[] = [
    { key: 'general', label: 'General' },
    ...stages.map((s) => ({ key: s.id as StageId, label: s.short })),
  ]

  const history = useMemo(() => {
    const full = computePositionHistory(
      users,
      matches,
      predictions,
      scope === 'general' ? undefined : scope,
      viewer,
    )
    const allowed = memberIdsForSelectedGroups(groups, selectedGroupIds)
    if (!allowed) return full
    return {
      points: full.points.map((p) => ({
        ...p,
        ranks: Object.fromEntries(
          Object.entries(p.ranks).filter(([userId]) => allowed.has(userId)),
        ),
      })),
      players: full.players.filter((p) => allowed.has(p.userId)),
    }
  }, [users, matches, predictions, scope, viewer, selectedGroupIds, groups])

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted-foreground">
        Evoluția poziției fiecărui participant după fiecare meci. Alege scopul și
        selectează jucătorii pe care vrei să-i compari.
      </p>

      <div className="flex flex-wrap gap-2">
        {scopes.map((sc) => {
          const on = scope === sc.key
          return (
            <button
              key={String(sc.key)}
              type="button"
              onClick={() => setScope(sc.key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                on
                  ? 'border-transparent bg-primary text-primary-foreground'
                  : 'border-border text-muted-foreground hover:bg-secondary',
              )}
            >
              {sc.label}
            </button>
          )
        })}
      </div>

      <PositionEvolutionChart
        key={String(scope)}
        history={history}
        highlightUserId={highlightUserId}
      />
    </div>
  )
}
