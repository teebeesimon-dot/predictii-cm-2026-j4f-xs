'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Countdown } from '@/components/countdown'
import { TeamName } from '@/components/team-name'
import {
  X,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  ClipboardList,
  CalendarClock,
  Sparkles,
} from 'lucide-react'
import type { Match } from '@/lib/types'
import { setResumeCardEnabled, updateLastSeenRank } from '@/lib/data'

export interface HomeResumeProps {
  userId: string
  displayName: string
  editionLabel: string
  remaining: number
  myRank: number
  myPoints: number
  rankDelta: number | null
  latestPoints: number | null
  latestMatch: Match | null
  nextMatch: Match | null
}

/**
 * Cardul de rezumat afișat la deschiderea aplicației. Primește date deja
 * calculate de dashboard (fără citiri Firestore noi). Utilizatorul îl poate
 * ascunde definitiv („Nu mai afișa") — reactivabil din Setări.
 */
export function HomeResume({
  userId,
  displayName,
  editionLabel,
  remaining,
  myRank,
  myPoints,
  rankDelta,
  latestPoints,
  latestMatch,
  nextMatch,
}: HomeResumeProps) {
  const [dismissed, setDismissed] = useState(false)
  const [hiding, setHiding] = useState(false)
  // Actualizăm „ultimul rang văzut" o singură dată după afișare, doar dacă s-a
  // schimbat — o scriere ieftină și rară, nu la fiecare randare.
  const syncedRef = useRef(false)
  useEffect(() => {
    if (syncedRef.current) return
    if (myRank <= 0) return
    syncedRef.current = true
    updateLastSeenRank(userId, myRank).catch(() => {})
  }, [userId, myRank])

  if (dismissed) return null

  async function handleDontShowAgain() {
    setHiding(true)
    try {
      await setResumeCardEnabled(userId, false)
    } catch {
      // Chiar dacă scrierea eșuează, ascundem local pentru sesiunea curentă.
    }
    setDismissed(true)
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <div>
              <p className="font-heading text-lg font-bold leading-tight">
                {`Salut, ${displayName}!`}
              </p>
              <p className="text-sm text-muted-foreground">
                {`Rezumatul tău pentru ${editionLabel}`}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ascunde rezumatul"
            className="-mr-2 -mt-1 shrink-0"
            onClick={() => setDismissed(true)}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Statistici rapide */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ResumeStat
            label="Locul tău"
            value={myRank > 0 ? `#${myRank}` : '-'}
            trailing={<RankDeltaBadge delta={rankDelta} />}
          />
          <ResumeStat label="Puncte" value={String(myPoints)} />
          <ResumeStat
            label="De completat"
            value={String(remaining)}
            highlight={remaining > 0}
          />
          <ResumeStat
            label="Ultimul meci"
            value={latestPoints !== null ? `+${latestPoints}` : '-'}
            hint={
              latestMatch
                ? `${latestMatch.homeTeam}–${latestMatch.awayTeam}`
                : undefined
            }
          />
        </div>

        {/* Următorul meci + countdown */}
        {nextMatch && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="size-3.5" />
              Următorul meci
            </div>
            <div className="flex items-center gap-2">
              <TeamName
                team={nextMatch.homeTeam}
                align="right"
                className="flex-1 justify-end text-sm font-semibold"
              />
              <span className="shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-bold text-muted-foreground">
                vs
              </span>
              <TeamName
                team={nextMatch.awayTeam}
                className="flex-1 text-sm font-semibold"
              />
            </div>
            <div className="self-center">
              <Countdown kickoff={nextMatch.kickoff} />
            </div>
          </div>
        )}

        {/* Acțiuni */}
        <div className="flex flex-wrap items-center gap-2">
          {remaining > 0 && (
            <Link
              href="/predictions"
              className={buttonVariants({ size: 'sm' })}
            >
              <ClipboardList className="size-4" />
              {`Completează (${remaining})`}
            </Link>
          )}
          <Link
            href="/standings"
            className={buttonVariants({ variant: 'secondary', size: 'sm' })}
          >
            <Trophy className="size-4" />
            Clasament
          </Link>
          <button
            type="button"
            onClick={handleDontShowAgain}
            disabled={hiding}
            className="ml-auto text-xs font-medium text-muted-foreground underline-offset-2 hover:underline disabled:opacity-50"
          >
            Nu mai afișa
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

function ResumeStat({
  label,
  value,
  hint,
  trailing,
  highlight,
}: {
  label: string
  value: string
  hint?: string
  trailing?: React.ReactNode
  highlight?: boolean
}) {
  return (
    <div
      className={
        'flex flex-col gap-0.5 rounded-lg border p-2.5 ' +
        (highlight
          ? 'border-accent/40 bg-accent/10'
          : 'border-border bg-card')
      }
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="flex items-center gap-1.5 font-heading text-xl font-bold tabular-nums">
        {value}
        {trailing}
      </span>
      {hint && (
        <span className="truncate text-[11px] text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  )
}

function RankDeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null
  if (delta === 0) {
    return (
      <Badge variant="secondary" className="gap-0.5 px-1.5 py-0 text-[10px]">
        <Minus className="size-3" />
      </Badge>
    )
  }
  const up = delta > 0
  return (
    <Badge
      className={
        'gap-0.5 px-1.5 py-0 text-[10px] ' +
        (up
          ? 'bg-primary/15 text-primary hover:bg-primary/15'
          : 'bg-destructive/15 text-destructive hover:bg-destructive/15')
      }
    >
      {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
      {Math.abs(delta)}
    </Badge>
  )
}
