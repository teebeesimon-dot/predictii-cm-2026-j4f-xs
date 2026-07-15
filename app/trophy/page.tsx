'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useAchievements } from '@/lib/achievements/hooks'
import { AchievementCard } from '@/components/achievement-card'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { Trophy } from 'lucide-react'

export default function TrophyPage() {
  return (
    <AppShell>
      <TrophyContent />
    </AppShell>
  )
}

function MedalCount({
  count,
  label,
  color,
}: {
  count: number
  label: string
  color: string
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className="text-2xl font-bold tabular-nums"
        style={{ color }}
      >
        {count}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function TrophyContent() {
  const { states, unlocked, locked, totalMedals, isLoading } =
    useAchievements()

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <HeaderSkeleton />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Trophy className="size-7 shrink-0 text-[#ffd700]" />
          <h1 className="font-heading text-3xl font-bold">Vitrina trofeelor</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Achievement-urile deblocate, medaliile câștigate și recordurile
          personale.
        </p>
      </div>

      {/* Medalii summary */}
      <Card>
        <CardContent className="flex items-center justify-around p-5">
          <MedalCount
            count={totalMedals.gold}
            label="Aur"
            color="#ffd700"
          />
          <div className="h-10 w-px bg-border" />
          <MedalCount
            count={totalMedals.silver}
            label="Argint"
            color="#b0b8c1"
          />
          <div className="h-10 w-px bg-border" />
          <MedalCount
            count={totalMedals.bronze}
            label="Bronz"
            color="#cd7f32"
          />
          <div className="h-10 w-px bg-border" />
          <div className="flex flex-col items-center gap-1">
            <span className="text-2xl font-bold tabular-nums text-primary">
              {unlocked.length}
            </span>
            <span className="text-xs text-muted-foreground">
              / {states.length}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Achievement-uri tabbed */}
      <Tabs defaultValue="all">
        <TabsList className="flex w-full">
          <TabsTrigger value="all" className="flex-1">
            Toate ({states.length})
          </TabsTrigger>
          <TabsTrigger value="unlocked" className="flex-1">
            Deblocate ({unlocked.length})
          </TabsTrigger>
          <TabsTrigger value="locked" className="flex-1">
            Blocate ({locked.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <AchievementGrid states={states} />
        </TabsContent>
        <TabsContent value="unlocked" className="mt-4">
          {unlocked.length === 0 ? (
            <EmptyState message="Niciun achievement deblocat încă. Pune niște pronosticuri!" />
          ) : (
            <AchievementGrid states={unlocked} />
          )}
        </TabsContent>
        <TabsContent value="locked" className="mt-4">
          {locked.length === 0 ? (
            <EmptyState message="Ai deblocat toate achievement-urile. Felicitări!" />
          ) : (
            <AchievementGrid states={locked} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AchievementGrid({
  states,
}: {
  states: import('@/lib/achievements/types').AchievementState[]
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {states.map((s) => (
        <AchievementCard key={s.def.id} state={s} />
      ))}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
      <Trophy className="size-10 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

function HeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  )
}
