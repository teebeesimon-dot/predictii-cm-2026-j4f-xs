'use client'

import type { Group } from '@/lib/types'
import { cn } from '@/lib/utils'

type GroupBadgesProps = {
  groups: Group[]
  className?: string
  /** Pe ecrane mici afișăm doar emoji-ul. */
  compact?: boolean
}

/** Badge-uri discrete pentru grupele unui utilizator (clasament etc.). */
export function GroupBadges({ groups, className, compact }: GroupBadgesProps) {
  if (groups.length === 0) return null

  return (
    <span
      className={cn(
        'inline-flex max-w-full flex-wrap items-center gap-1',
        className,
      )}
    >
      {groups.map((g) => (
        <span
          key={g.id}
          title={`${g.emoji} ${g.name}`}
          className={cn(
            'inline-flex max-w-[9rem] items-center gap-0.5 truncate rounded-md border border-border/70 bg-secondary/60 px-1.5 py-0 text-[10px] font-medium leading-4 text-muted-foreground',
            compact && 'max-w-none px-1',
          )}
        >
          <span className="shrink-0 text-[11px] leading-none">{g.emoji}</span>
          {!compact && (
            <span className="truncate hidden sm:inline">{g.name}</span>
          )}
        </span>
      ))}
    </span>
  )
}
