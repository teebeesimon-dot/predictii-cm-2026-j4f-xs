'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import { useEdition } from '@/components/edition-provider'
import { computeStandings, computePositionHistory } from '@/lib/data'
import type { AppUser, Match, Prediction } from '@/lib/types'
import { type StageId } from '@/lib/types'
import { stagesForEdition, type StageDef } from '@/lib/stages'
import { cn } from '@/lib/utils'
import { StandingsTable } from '@/components/standings-table'
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
  // Etapele competiției curente (World Cup = 5, Champions League = 11).
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

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions
  const viewer = { id: user?.id, isAdmin: user?.isAdmin }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Clasamente</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          General și pe fiecare etapă a turneului. Egalitățile împart aceeași
          poziție.
        </p>
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
                  rows={computeStandings(
                    users,
                    matches,
                    predictions,
                    undefined,
                    viewer,
                  )}
                  highlightUserId={user?.id}
                />
              </TabsContent>

              {stages.map((s) => (
                <TabsContent key={s.id} value={String(s.id)} className="mt-4">
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    {s.label}
                  </p>
                  <StandingsTable
                    rows={computeStandings(
                      users,
                      matches,
                      predictions,
                      s.id as StageId,
                      viewer,
                    )}
                    highlightUserId={user?.id}
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
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Tab-ul de evoluție, cu selector de scop: general sau o etapă anume. Graficul
// se recalculează în funcție de scopul ales.
function EvolutionTab({
  users,
  matches,
  predictions,
  viewer,
  highlightUserId,
  stages,
}: {
  users: AppUser[]
  matches: Match[]
  predictions: Prediction[]
  viewer: { id?: string; isAdmin?: boolean }
  highlightUserId?: string
  stages: StageDef[]
}) {
  // 'general' = clasament cumulat pe tot turneul; altfel o etapă (StageId).
  const [scope, setScope] = useState<'general' | StageId>('general')

  const scopes: { key: 'general' | StageId; label: string }[] = [
    { key: 'general', label: 'General' },
    ...stages.map((s) => ({ key: s.id as StageId, label: s.short })),
  ]

  const history = computePositionHistory(
    users,
    matches,
    predictions,
    scope === 'general' ? undefined : scope,
    viewer,
  )

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted-foreground">
        Evoluția poziției fiecărui participant după fiecare meci. Alege scopul și
        selectează jucătorii pe care vrei să-i compari.
      </p>

      {/* Selector de scop: general sau etapă */}
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
