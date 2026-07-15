'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Trophy, Target, Crosshair, Award, TrendingUp, Bell, Activity } from 'lucide-react'
import type { Match, Prediction, AppUser } from '@/lib/types'
import type { StoredNotification } from '@/lib/data'
import { computeStandings, computePositionHistory } from '@/lib/data'
import { formatKickoff } from '@/lib/utils'
import { deepLinkForNotification } from '@/lib/notifications/categories'

interface PersonalDashboardProps {
  userId: string
  users: AppUser[]
  matches: Match[]
  predictions: Prediction[]
  notifications: StoredNotification[]
  editionCount: number
}

interface StatCard {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
}

export function PersonalDashboard({
  userId,
  users,
  matches,
  predictions,
  notifications,
  editionCount,
}: PersonalDashboardProps) {
  // Toate statisticile derivă din datele deja încărcate — fără citiri noi.
  const stats = useMemo(() => {
    const viewer = { id: userId }
    const rows = computeStandings(users, matches, predictions, undefined, viewer)
    const me = rows.find((r) => r.userId === userId)
    const history = computePositionHistory(users, matches, predictions, undefined, viewer)
    // Cel mai bun rang istoric al utilizatorului de-a lungul etapelor jucate.
    let bestRank = me?.rank ?? 0
    for (const p of history.points) {
      const r = p.ranks[userId]
      if (r && (bestRank === 0 || r < bestRank)) bestRank = r
    }
    const played = me?.played ?? 0
    // „Acuratețe" = procent de pronosticuri cu 1X2 corect din meciurile jucate.
    const accuracy = played > 0 ? Math.round(((me?.correct1x2 ?? 0) / played) * 100) : 0
    return {
      points: me?.points ?? 0,
      rank: me?.rank ?? 0,
      bestRank,
      accuracy,
      exact: me?.exact ?? 0,
    }
  }, [users, matches, predictions, userId])

  const statCards: StatCard[] = [
    { label: 'Total puncte', value: String(stats.points), icon: Trophy },
    { label: 'Rang curent', value: stats.rank > 0 ? `#${stats.rank}` : '—', icon: TrendingUp },
    { label: 'Cel mai bun rang', value: stats.bestRank > 0 ? `#${stats.bestRank}` : '—', icon: Award },
    { label: 'Acuratețe', value: `${stats.accuracy}%`, icon: Target },
    { label: 'Scoruri exacte', value: String(stats.exact), icon: Crosshair },
    { label: 'Competiții', value: String(editionCount), icon: Trophy },
  ]

  // Activitate recentă: ultimele notificări (deja încărcate).
  const recentNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.sentAt - a.sentAt).slice(0, 5),
    [notifications],
  )

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">Statistici</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {statCards.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
              >
                <Icon className="size-5 text-muted-foreground" />
                <span className="text-2xl font-bold text-foreground">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
          <Activity className="size-5" />
          Activitate recentă
        </h2>
        {recentNotifications.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nicio activitate recentă.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recentNotifications.map((n) => {
              const href = deepLinkForNotification(n.metadata)
              return (
                <li key={n.key}>
                  <Link
                    href={href}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-secondary"
                  >
                    <Bell className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{n.title}</span>
                      <span className="line-clamp-2 text-xs text-muted-foreground">{n.body}</span>
                      {n.sentAt > 0 && (
                        <span className="text-[11px] text-muted-foreground">
                          {formatKickoff(new Date(n.sentAt).toISOString())}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
