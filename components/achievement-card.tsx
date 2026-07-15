'use client'

import { cn } from '@/lib/utils'
import type { AchievementState } from '@/lib/achievements/types'
import type { MedalType, AchievementRarity } from '@/lib/achievements/types'
import {
  Pencil,
  Target,
  Crosshair,
  Star,
  Zap,
  Shield,
  Crown,
  TrendingUp,
  Medal,
  Trophy,
  Flame,
  Flag,
  BarChart2,
  Lock,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Icon map — adaugă iconițe noi aici fără a modifica restul sistemului.
// ---------------------------------------------------------------------------
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Pencil,
  Target,
  Crosshair,
  Star,
  Zap,
  Shield,
  Crown,
  TrendingUp,
  Medal,
  Trophy,
  Flame,
  Flag,
  BarChart2,
}

// ---------------------------------------------------------------------------
// Culori per raritate (border + icon tint)
// ---------------------------------------------------------------------------
const rarityConfig: Record<
  AchievementRarity,
  { border: string; glow: string; badge: string; label: string }
> = {
  common: {
    border: 'border-border',
    glow: '',
    badge: 'bg-secondary text-secondary-foreground',
    label: 'Comun',
  },
  uncommon: {
    border: 'border-primary/40',
    glow: '',
    badge: 'bg-primary/15 text-primary',
    label: 'Necomun',
  },
  rare: {
    border: 'border-[#a855f7]/40',
    glow: '',
    badge: 'bg-[#a855f7]/15 text-[#a855f7]',
    label: 'Rar',
  },
  epic: {
    border: 'border-[#f59e0b]/40',
    glow: '',
    badge: 'bg-[#f59e0b]/15 text-[#f59e0b]',
    label: 'Epic',
  },
  legendary: {
    border: 'border-[#ffd700]/50',
    glow: 'ring-1 ring-[#ffd700]/30',
    badge: 'bg-[#ffd700]/15 text-[#ffd700]',
    label: 'Legendar',
  },
}

const medalColors: Record<MedalType, string> = {
  bronze: '#cd7f32',
  silver: '#b0b8c1',
  gold: '#ffd700',
  none: 'transparent',
}

// ---------------------------------------------------------------------------
// ProgressBar
// ---------------------------------------------------------------------------
function ProgressBar({
  value,
  max,
  label,
}: {
  value: number
  max: number
  label?: string
}) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {label ?? 'Progres'}
        </span>
        <span className="text-xs font-medium tabular-nums">
          {value} / {max}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// AchievementCard
// ---------------------------------------------------------------------------
export function AchievementCard({ state }: { state: AchievementState }) {
  const { def, unlocked, progress } = state
  const rc = rarityConfig[def.rarity]
  const IconComp = ICON_MAP[def.icon] ?? Star
  const hasMedal = def.medal !== 'none'
  const medalColor = medalColors[def.medal]

  return (
    <div
      className={cn(
        'relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-opacity',
        rc.border,
        rc.glow,
        !unlocked && 'opacity-50',
      )}
    >
      {/* Medalion colorat (colț dreapta sus) */}
      {hasMedal && unlocked && (
        <span
          className="absolute right-3 top-3 size-2.5 rounded-full"
          style={{ backgroundColor: medalColor }}
          aria-label={`Medalie ${def.medal}`}
        />
      )}

      {/* Icon + titlu */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg',
            unlocked ? 'bg-primary/15' : 'bg-secondary',
          )}
        >
          {unlocked ? (
            <IconComp
              className={cn(
                'size-5',
                def.rarity === 'legendary'
                  ? 'text-[#ffd700]'
                  : def.rarity === 'epic'
                    ? 'text-[#f59e0b]'
                    : 'text-primary',
              )}
            />
          ) : (
            <Lock className="size-4 text-muted-foreground" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-tight">{def.title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
            {def.description}
          </p>
        </div>
      </div>

      {/* Badge raritate */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
            rc.badge,
          )}
        >
          {rc.label}
        </span>

        {/* Medalie text */}
        {hasMedal && (
          <span
            className="text-[10px] font-semibold uppercase tracking-wide"
            style={{ color: medalColor }}
          >
            {def.medal === 'bronze'
              ? 'Bronz'
              : def.medal === 'silver'
                ? 'Argint'
                : 'Aur'}
          </span>
        )}
      </div>

      {/* Progress bar (doar dacă are target și nu e deblocat) */}
      {def.progressTarget && (
        <ProgressBar
          value={progress}
          max={def.progressTarget}
          label={def.progressLabel}
        />
      )}
    </div>
  )
}
