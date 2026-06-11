'use client'

import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import { computeStandings } from '@/lib/data'
import { STAGES, type StageId } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Medal, Crown } from 'lucide-react'

export default function AwardsPage() {
  return (
    <AppShell>
      <AwardsContent />
    </AppShell>
  )
}

function AwardsContent() {
  const { user } = useAuth()
  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions
  const viewer = { id: user?.id, isAdmin: user?.isAdmin }

  function stageWinner(stage?: StageId) {
    if (!ready) return null
    const rows = computeStandings(users, matches, predictions, stage, viewer)
    const top = rows[0]
    // a winner only exists if there is at least 1 point scored in that scope
    if (!top || top.points === 0) return null
    return top
  }

  const overall = stageWinner(undefined)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Premii</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Câștigătorii fiecărei etape și marele campion al turneului.
        </p>
      </div>

      {loading || !ready ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : (
        <>
          {/* Overall champion */}
          <Card className="overflow-hidden border-accent/50 bg-accent/10">
            <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg shadow-accent/30">
                <Crown className="size-8" />
              </div>
              <p className="text-sm font-medium uppercase tracking-widest text-accent">
                Marele Campion
              </p>
              {overall ? (
                <>
                  <p className="font-heading text-3xl font-bold capitalize">
                    {overall.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {overall.points} puncte · {overall.exact} scoruri exacte
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Încă nedecis</p>
              )}
            </CardContent>
          </Card>

          {/* Stage winners */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STAGES.map((s) => {
              const w = stageWinner(s.id as StageId)
              return (
                <Card key={s.id}>
                  <CardContent className="flex flex-col gap-3 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center rounded-lg bg-secondary text-primary">
                        <Medal className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    </div>
                    <div className="rounded-lg border border-border bg-secondary/40 p-3">
                      {w ? (
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Trophy className="size-4 text-accent" />
                            <span className="font-heading font-bold capitalize">
                              {w.username}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-muted-foreground">
                            {w.points} pct
                          </span>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Încă nedecis
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
