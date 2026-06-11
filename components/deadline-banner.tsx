'use client'

import { useEffect, useState } from 'react'
import { Clock, Lock } from 'lucide-react'
import { formatKickoff } from '@/lib/utils'

function diff(target: number) {
  const total = Math.max(0, target - Date.now())
  const days = Math.floor(total / 86400000)
  const hours = Math.floor((total % 86400000) / 3600000)
  const minutes = Math.floor((total % 3600000) / 60000)
  const seconds = Math.floor((total % 60000) / 1000)
  return { total, days, hours, minutes, seconds }
}

// Banner cu termenul limită de completare a unei etape/runde.
export function DeadlineBanner({
  deadline,
  label,
}: {
  deadline: string | null
  label?: string
}) {
  const target = deadline ? new Date(deadline).getTime() : 0
  const [time, setTime] = useState(() => diff(target))

  useEffect(() => {
    if (!deadline) return
    const i = setInterval(() => setTime(diff(target)), 1000)
    return () => clearInterval(i)
  }, [target, deadline])

  if (!deadline) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
        <Clock className="size-4 shrink-0" />
        <span>{label ?? 'Termenul limită va fi anunțat de administrator.'}</span>
      </div>
    )
  }

  if (time.total <= 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
        <Lock className="size-4 shrink-0" />
        <span>Termenul a expirat — pronosticurile sunt blocate.</span>
      </div>
    )
  }

  const parts = [
    time.days > 0 ? `${time.days}z` : null,
    `${String(time.hours).padStart(2, '0')}h`,
    `${String(time.minutes).padStart(2, '0')}m`,
    `${String(time.seconds).padStart(2, '0')}s`,
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Clock className="size-4 shrink-0 text-primary" />
        <span>
          {label ?? 'Termen limită'}:{' '}
          <span className="text-muted-foreground">{formatKickoff(deadline)}</span>
        </span>
      </div>
      <span className="font-heading text-lg font-bold tabular-nums text-primary">
        {parts.join(' ')}
      </span>
    </div>
  )
}
