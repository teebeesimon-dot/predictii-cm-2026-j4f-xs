'use client'

import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import { useEdition } from '@/components/edition-provider'
import { computeStandings } from '@/lib/data'
import { type StageId } from '@/lib/types'
import { stagesForEdition } from '@/lib/stages'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Trophy, Medal } from 'lucide-react'
import Image from 'next/image'

export default function AwardsPage() {
  return (
    <AppShell>
      <AwardsContent />
    </AppShell>
  )
}

function AwardsContent() {
  const { user } = useAuth()
  const { editionId } = useEdition()
  // Etapele competiției curente (World Cup = 5, Champions League = 11).
  const stages = stagesForEdition(editionId)
  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions
  // La premii, jucătorii ascunși din clasamente nu apar deloc — nici măcar
  // pentru admin. Singura excepție e propriul cont (potrivire pe id), deci NU
  // transmitem isAdmin aici.
  const viewer = { id: user?.id }

  // Toți câștigătorii dintr-un clasament: rândurile de pe locul 1. La egalitate
  // de puncte mai mulți jucători împart locul 1, deci toți sunt câștigători.
  function stageWinners(stage?: StageId) {
    if (!ready) return []
    const rows = computeStandings(users, matches, predictions, stage, viewer)
    // un câștigător există doar dacă s-a marcat cel puțin 1 punct în acel scop
    return rows.filter((r) => r.rank === 1 && r.points > 0)
  }

  const overall = stageWinners(undefined)

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
              <Image
                src="/cupa.png"
                alt="Trofeu Marele Campion"
                width={200}
                height={260}
                className="h-32 w-auto object-contain drop-shadow-lg sm:h-40"
                priority
              />
              <p className="text-sm font-medium uppercase tracking-widest text-accent">
                {overall.length > 1 ? 'Marii Campioni' : 'Marele Campion'}
              </p>
              {overall.length > 0 ? (
                <>
                  <div className="flex flex-col items-center gap-1">
                    {overall.map((w) => (
                      <p
                        key={w.userId}
                        className="font-heading text-3xl font-bold capitalize"
                      >
                        {w.name}
                      </p>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {overall[0].points} puncte · {overall[0].exact} scoruri exacte
                    {overall.length > 1 && ` · ${overall.length} la egalitate`}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Încă nedecis</p>
              )}
            </CardContent>
          </Card>

          {/* Stage winners */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stages.map((s) => {
              const winners = stageWinners(s.id as StageId)
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
                      {winners.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {winners.map((w) => (
                            <div
                              key={w.userId}
                              className="flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <Trophy className="size-4 text-accent" />
                                <span className="font-heading font-bold capitalize">
                                  {w.name}
                                </span>
                              </div>
                              <span className="text-sm font-semibold text-muted-foreground">
                                {w.points} pct
                              </span>
                            </div>
                          ))}
                          {winners.length > 1 && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {winners.length} câștigători la egalitate
                            </p>
                          )}
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
