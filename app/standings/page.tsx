'use client'

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions, useGroups } from '@/lib/hooks'
import { useEdition } from '@/components/edition-provider'
import { computeStandings, computePositionHistory } from '@/lib/data'
import type { AppUser, Match, Prediction } from '@/lib/types'
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

  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()
  const { data: groups = [] } = useGroups()

  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions
  const viewer = { id: user?.id, isAdmin: user?.isAdmin }

  const userGroups = useMemo(() => buildUserGroupsMap(groups), [groups])

  function rowsFor(stage?: StageId) {
    if (!ready) return []
    const rows = computeStandings(
      users,
      matches,
      predictions,
      stage,
      viewer,
    )
    return filterStandingRowsByGroups(rows, groups, selectedGroupIds)
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
          {loading || !ready ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Tabs key={initialTab} defaultValue={initialTab}>
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
                <StandingsTable
                  rows={rowsFor(undefined)}
                  highlightUserId={user?.id}
                  userGroups={userGroups}
                />
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
  viewer: { id?: string; isAdmin?: boolean }
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
