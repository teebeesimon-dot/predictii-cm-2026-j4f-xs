'use client'

import Link from 'next/link'
import { useAchievements } from '@/lib/achievements/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Award } from 'lucide-react'

/**
 * Card de sumar al achievement-urilor afișat pe dashboard. Arată numărul de
 * achievement-uri deblocate, medaliile câștigate și un link spre pagina
 * Trophy Cabinet. Refolosește date din SWR cache — zero citiri Firestore noi.
 */
export function AchievementsSummaryCard() {
  const { unlocked, totalMedals, states, isLoading } = useAchievements()

  if (isLoading) {
    return <Skeleton className="h-28 w-full rounded-xl" />
  }

  const medals = [
    { color: '#ffd700', count: totalMedals.gold, label: 'aur' },
    { color: '#b0b8c1', count: totalMedals.silver, label: 'argint' },
    { color: '#cd7f32', count: totalMedals.bronze, label: 'bronz' },
  ]

  // Progresul spre următorul achievement (primul neblocat cu progressTarget).
  const next = states.find(
    (s) => !s.unlocked && s.def.progressTarget != null,
  )
  const pct = next
    ? Math.round((next.progress / (next.def.progressTarget ?? 1)) * 100)
    : null

  return (
    <Card className="border-[#ffd700]/20 bg-[#ffd700]/5">
      <CardContent className="flex flex-col gap-3 p-5">
        {/* Titlu */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Award className="size-5 text-[#ffd700]" />
            <span className="font-heading font-semibold">Vitrina trofeelor</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {unlocked.length} / {states.length} deblocate
          </span>
        </div>

        {/* Medalii */}
        <div className="flex items-center gap-4">
          {medals.map((m) => (
            <div key={m.label} className="flex items-center gap-1.5">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <span className="text-sm font-semibold tabular-nums">
                {m.count}
              </span>
              <span className="text-xs text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>

        {/* Progres spre next achievement */}
        {next && pct !== null && (
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Urmează: {next.def.title}
              </span>
              <span className="text-xs font-medium tabular-nums">
                {next.progress} / {next.def.progressTarget}{' '}
                {next.def.progressLabel ?? ''}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[#ffd700] transition-all duration-500"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={next.progress}
                aria-valuemin={0}
                aria-valuemax={next.def.progressTarget ?? 1}
              />
            </div>
          </div>
        )}

        {/* Link */}
        <Link
          href="/trophy"
          className={buttonVariants({
            variant: 'outline',
            size: 'sm',
            className: 'self-start',
          })}
        >
          <Award className="size-4" />
          Vezi toate
        </Link>
      </CardContent>
    </Card>
  )
}
