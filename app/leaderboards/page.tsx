'use client'

import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import {
  computeExactScoresLeaderboard,
  computeAccuracyLeaderboard,
  computeMonthlyLeaderboard,
  computeCompetitionLeaderboard,
  type LeaderboardRow,
} from '@/lib/leaderboards'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { BarChart2, Target, Calendar, LayoutList } from 'lucide-react'

export default function LeaderboardsPage() {
  return (
    <AppShell>
      <LeaderboardsContent />
    </AppShell>
  )
}

function LeaderboardsContent() {
  const { user } = useAuth()
  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions
  const viewer = { id: user?.id, isAdmin: user?.isAdmin }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Clasamente extinse</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scoruri exacte, acuratețe, lunar și general per competiție.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading || !ready ? (
            <div className="flex flex-col gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="exact">
              <TabsList className="flex w-full flex-wrap">
                <TabsTrigger value="exact" className="flex-1 gap-1.5">
                  <Target className="size-3.5" />
                  <span className="hidden sm:inline">Scoruri exacte</span>
                  <span className="sm:hidden">Exacte</span>
                </TabsTrigger>
                <TabsTrigger value="accuracy" className="flex-1 gap-1.5">
                  <BarChart2 className="size-3.5" />
                  <span className="hidden sm:inline">Acuratețe</span>
                  <span className="sm:hidden">Acuratețe</span>
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex-1 gap-1.5">
                  <Calendar className="size-3.5" />
                  <span className="hidden sm:inline">Lunar</span>
                  <span className="sm:hidden">Lunar</span>
                </TabsTrigger>
                <TabsTrigger value="competition" className="flex-1 gap-1.5">
                  <LayoutList className="size-3.5" />
                  <span className="hidden sm:inline">Competiție</span>
                  <span className="sm:hidden">Comp.</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="exact" className="mt-4">
                <LeaderboardTable
                  rows={computeExactScoresLeaderboard(users, matches, predictions, viewer)}
                  highlightId={user?.id}
                  valueLabel="Scoruri exacte"
                  secondaryLabel="Meciuri jucate"
                />
              </TabsContent>

              <TabsContent value="accuracy" className="mt-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Procent pronosticuri corecte (1X2). Minim 5 meciuri jucate.
                </p>
                <LeaderboardTable
                  rows={computeAccuracyLeaderboard(users, matches, predictions, viewer)}
                  highlightId={user?.id}
                  valueLabel="Acuratețe"
                  valueSuffix="%"
                  secondaryLabel="Meciuri"
                />
              </TabsContent>

              <TabsContent value="monthly" className="mt-4">
                <MonthlyTab
                  users={users}
                  matches={matches}
                  predictions={predictions}
                  viewer={viewer}
                  highlightId={user?.id}
                />
              </TabsContent>

              <TabsContent value="competition" className="mt-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Punctaj total în competiția curentă (ediția selectată).
                </p>
                <LeaderboardTable
                  rows={computeCompetitionLeaderboard(users, matches, predictions, viewer)}
                  highlightId={user?.id}
                  valueLabel="Puncte"
                  secondaryLabel="Exacte"
                />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Tabel generic de clasament
// ---------------------------------------------------------------------------

function LeaderboardTable({
  rows,
  highlightId,
  valueLabel,
  valueSuffix = '',
  secondaryLabel,
}: {
  rows: LeaderboardRow[]
  highlightId?: string
  valueLabel: string
  valueSuffix?: string
  secondaryLabel?: string
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nu există date suficiente pentru acest clasament.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-xs text-muted-foreground">
            <th className="pb-2 pr-3 text-left font-medium">#</th>
            <th className="pb-2 pr-3 text-left font-medium">Jucător</th>
            <th className="pb-2 pr-3 text-right font-medium">{valueLabel}</th>
            {secondaryLabel && (
              <th className="pb-2 text-right font-medium hidden sm:table-cell">
                {secondaryLabel}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isMe = row.userId === highlightId
            return (
              <tr
                key={row.userId}
                className={cn(
                  'border-b border-border/50 last:border-0',
                  isMe && 'bg-primary/8 font-semibold',
                )}
              >
                <td className="py-2.5 pr-3">
                  <RankBadge rank={row.rank} />
                </td>
                <td className="py-2.5 pr-3">
                  <span className={cn(isMe && 'text-primary')}>
                    {row.name}
                  </span>
                  {isMe && (
                    <span className="ml-1.5 text-[10px] text-muted-foreground">
                      (tu)
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums">
                  {row.value}
                  {valueSuffix}
                </td>
                {secondaryLabel && (
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground hidden sm:table-cell">
                    {row.secondary ?? '—'}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#ffd700]/20 text-xs font-bold text-[#ffd700]">
        1
      </span>
    )
  if (rank === 2)
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#b0b8c1]/20 text-xs font-bold text-[#b0b8c1]">
        2
      </span>
    )
  if (rank === 3)
    return (
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#cd7f32]/20 text-xs font-bold text-[#cd7f32]">
        3
      </span>
    )
  return (
    <span className="inline-flex size-6 items-center justify-center text-xs text-muted-foreground tabular-nums">
      {rank}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Tab lunar cu selector lună
// ---------------------------------------------------------------------------

import { useState } from 'react'
import type { AppUser, Match, Prediction } from '@/lib/types'

function MonthlyTab({
  users,
  matches,
  predictions,
  viewer,
  highlightId,
}: {
  users: AppUser[]
  matches: Match[]
  predictions: Prediction[]
  viewer: { id?: string; isAdmin?: boolean }
  highlightId?: string
}) {
  const now = new Date()
  const [offset, setOffset] = useState(0) // 0 = luna curentă, -1 = luna trecută

  const refDate = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const monthLabel = refDate.toLocaleDateString('ro-RO', {
    month: 'long',
    year: 'numeric',
  })

  const rows = computeMonthlyLeaderboard(
    users,
    matches,
    predictions,
    viewer,
    refDate,
  )

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOffset((o) => o - 1)}
          className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-secondary"
        >
          &larr;
        </button>
        <span className="min-w-[140px] text-center text-sm font-medium capitalize">
          {monthLabel}
        </span>
        <button
          type="button"
          onClick={() => setOffset((o) => Math.min(0, o + 1))}
          disabled={offset === 0}
          className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-40"
        >
          &rarr;
        </button>
      </div>
      <LeaderboardTable
        rows={rows}
        highlightId={highlightId}
        valueLabel="Puncte"
      />
    </div>
  )
}
