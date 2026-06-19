'use client'

import { useMemo, useState } from 'react'
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { cn } from '@/lib/utils'
import type { PositionHistory } from '@/lib/data'

// Paletă de culori distincte pentru jucători (date de vizualizare, nu chrome).
// Aleasă să fie ușor de diferențiat chiar cu mulți jucători pe grafic.
const PALETTE = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#eab308', // yellow
  '#ec4899', // pink
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#84cc16', // lime
  '#f43f5e', // rose
  '#0ea5e9', // sky
  '#d946ef', // fuchsia
  '#10b981', // emerald
  '#f59e0b', // amber
]

export function PositionEvolutionChart({
  history,
  highlightUserId,
}: {
  history: PositionHistory
  highlightUserId?: string
}) {
  const { points, players } = history

  // Culoare fixă per jucător, după ordinea din clasamentul final.
  const colorFor = useMemo(() => {
    const map: Record<string, string> = {}
    players.forEach((p, i) => {
      map[p.userId] = PALETTE[i % PALETTE.length]
    })
    return map
  }, [players])

  // Implicit selectăm jucătorul curent + primii câțiva, ca să nu fie aglomerat.
  const [selected, setSelected] = useState<Set<string>>(() => {
    const init = new Set<string>()
    if (highlightUserId) init.add(highlightUserId)
    for (const p of players) {
      if (init.size >= 5) break
      init.add(p.userId)
    }
    return init
  })

  function toggle(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  // Date aplatizate pentru recharts: un obiect per meci, cu o cheie per jucător.
  const data = useMemo(
    () =>
      points.map((pt) => {
        const row: Record<string, number | string> = {
          label: pt.label,
          idx: pt.idx,
        }
        for (const p of players) {
          const r = pt.ranks[p.userId]
          if (r !== undefined) row[p.userId] = r
        }
        return row
      }),
    [points, players],
  )

  const config = useMemo(() => {
    const c: Record<string, { label: string; color: string }> = {}
    for (const p of players) {
      c[p.userId] = { label: p.name, color: colorFor[p.userId] }
    }
    return c
  }, [players, colorFor])

  if (points.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Graficul apare după ce se încheie primele meciuri cu rezultat oficial.
      </p>
    )
  }

  const playerCount = players.length

  return (
    <div className="flex flex-col gap-4">
      {/* Selectoare jucători, fiecare cu culoarea sa */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSelected(new Set(players.map((p) => p.userId)))}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          Toți
        </button>
        <button
          type="button"
          onClick={() => setSelected(new Set())}
          className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
        >
          Niciunul
        </button>
        <span className="mx-1 h-4 w-px bg-border" />
        {players.map((p) => {
          const on = selected.has(p.userId)
          const color = colorFor[p.userId]
          return (
            <button
              key={p.userId}
              type="button"
              onClick={() => toggle(p.userId)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                on
                  ? 'border-transparent text-foreground'
                  : 'border-border text-muted-foreground opacity-60 hover:opacity-100',
              )}
              style={on ? { backgroundColor: `${color}22` } : undefined}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {p.name}
              {p.userId === highlightUserId && (
                <span className="font-bold">(tu)</span>
              )}
            </button>
          )
        })}
      </div>

      <ChartContainer config={config} className="h-[420px] w-full">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            fontSize={11}
          />
          <YAxis
            reversed
            domain={[1, playerCount]}
            allowDecimals={false}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={28}
            fontSize={11}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          {players
            .filter((p) => selected.has(p.userId))
            .map((p) => (
              <Line
                key={p.userId}
                type="monotone"
                dataKey={p.userId}
                name={p.name}
                stroke={colorFor[p.userId]}
                strokeWidth={p.userId === highlightUserId ? 3 : 2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
                isAnimationActive={false}
              />
            ))}
        </LineChart>
      </ChartContainer>

      <p className="text-center text-xs text-muted-foreground">
        Poziția în clasamentul general după fiecare meci încheiat. Mai sus = loc
        mai bun.
      </p>
    </div>
  )
}
