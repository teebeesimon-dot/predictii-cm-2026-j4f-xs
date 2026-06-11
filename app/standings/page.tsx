'use client'

import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import { computeStandings } from '@/lib/data'
import { STAGES, type StageId } from '@/lib/types'
import { StandingsTable } from '@/components/standings-table'
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
  const searchParams = useSearchParams()
  const stageParam = searchParams.get('stage')
  const initialTab =
    stageParam && ['1', '2', '3', '4', '5'].includes(stageParam)
      ? stageParam
      : 'general'

  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions
console.log("USERS", users)
console.log("MATCHES", matches)
console.log("PREDICTIONS", predictions)

if (users && matches && predictions) {
  console.log(
    "STANDINGS",
    computeStandings(users, matches, predictions)
  )
}
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
                {STAGES.map((s) => (
                  <TabsTrigger key={s.id} value={String(s.id)} className="flex-1">
                    {s.short}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="general" className="mt-4">
                <StandingsTable
                  rows={computeStandings(users, matches, predictions)}
                  highlightUserId={user?.id}
                />
              </TabsContent>

              {STAGES.map((s) => (
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
                    )}
                    highlightUserId={user?.id}
                  />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
