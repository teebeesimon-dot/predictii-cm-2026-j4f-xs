'use client'

import { useEffect, useState } from 'react'

function diff(target: number) {
  const total = Math.max(0, target - Date.now())
  const days = Math.floor(total / 86400000)
  const hours = Math.floor((total % 86400000) / 3600000)
  const minutes = Math.floor((total % 3600000) / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  return { total, days, hours, minutes, seconds }
}

export function Countdown({ kickoff }: { kickoff: string }) {
  const target = new Date(kickoff).getTime()
  const [time, setTime] = useState(() => diff(target))

  useEffect(() => {
    const i = setInterval(() => setTime(diff(target)), 1000)
    return () => clearInterval(i)
  }, [target])

  if (time.total <= 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg bg-destructive/15 px-4 py-2 text-sm font-semibold text-destructive">
        Meciul a început
      </div>
    )
  }

  const units = [
    { value: time.days, label: 'Zile' },
    { value: time.hours, label: 'Ore' },
    { value: time.minutes, label: 'Min' },
    { value: time.seconds, label: 'Sec' },
  ]

  return (
    <div className="flex gap-2 sm:gap-3">
      {units.map((u) => (
        <div
          key={u.label}
          className="flex min-w-14 flex-col items-center rounded-xl border border-border bg-card px-2 py-3 sm:min-w-16"
        >
          <span className="font-heading text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
            {String(u.value).padStart(2, '0')}
          </span>
          <span className="mt-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {u.label}
          </span>
        </div>
      ))}
    </div>
  )
}
