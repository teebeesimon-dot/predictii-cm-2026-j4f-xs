'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKickoff } from '@/lib/utils'
import type { EngineRunLogEntry } from '@/lib/notifications/history/EngineRunLog'
import type { RecentNotificationEntry } from '@/lib/notifications/history/NotificationHistory'
import {
  ArrowLeft,
  Activity,
  RefreshCw,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Send,
  Loader2,
} from 'lucide-react'

interface SyncStatus {
  lastRunAt?: number
  lastUpdatedCount?: number
  lastCheckedCount?: number
  lastMessage?: string
  lastError?: string | null
}

interface OverviewData {
  runLog: EngineRunLogEntry[]
  recentNotifications: RecentNotificationEntry[]
  syncStatus: SyncStatus | null
}

export default function AdminOverviewPage() {
  return (
    <AppShell requireAdmin>
      <OverviewContent />
    </AppShell>
  )
}

function fmtTime(ms?: number): string {
  if (!ms) return '—'
  return formatKickoff(new Date(ms).toISOString())
}

function OverviewContent() {
  const { user } = useAuth()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/overview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: user.id }),
      })
      const json = (await res.json().catch(() => ({}))) as Record<string, unknown>
      if (!res.ok) throw new Error((json.error as string) || 'Eroare la încărcare.')
      setData(json as unknown as OverviewData)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const runLog = data?.runLog ?? []
  const notifications = data?.recentNotifications ?? []
  const sync = data?.syncStatus ?? null
  const lastRun = runLog[0]
  const totalFailed = runLog.reduce((a, r) => a + r.pushFailed, 0)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Înapoi la Administrare
        </Link>
        <div className="flex items-center justify-between gap-4">
          <h1 className="flex items-center gap-2 font-heading text-3xl font-bold tracking-tight">
            <Activity className="size-7 text-primary" />
            Prezentare generală
          </h1>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary/70 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <RefreshCw className="size-4" />
            )}
            Reîmprospătează
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <span className="text-foreground">{error}</span>
        </div>
      )}

      {/* Rezumat rapid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatBox label="Execuții jurnalizate" value={String(runLog.length)} />
        <StatBox
          label="Ultima execuție"
          value={lastRun ? fmtTime(lastRun.ranAt) : '—'}
        />
        <StatBox
          label="Notificări eșuate"
          value={String(totalFailed)}
          tone={totalFailed > 0 ? 'bad' : 'good'}
        />
        <StatBox
          label="Ultima sincronizare"
          value={fmtTime(sync?.lastRunAt)}
        />
      </div>

      {/* AutoSync */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <RefreshCw className="size-5 text-primary" />
          <CardTitle className="text-base">Sincronizare automată</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm">
          {sync ? (
            <>
              <Row label="Ultima rulare" value={fmtTime(sync.lastRunAt)} />
              <Row
                label="Meciuri verificate"
                value={String(sync.lastCheckedCount ?? 0)}
              />
              <Row
                label="Scoruri actualizate"
                value={String(sync.lastUpdatedCount ?? 0)}
              />
              {sync.lastMessage && (
                <Row label="Mesaj" value={sync.lastMessage} />
              )}
              {sync.lastError && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-2 text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <span>{sync.lastError}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              Nicio informație de sincronizare disponibilă.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Execuții Notification Engine */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Activity className="size-5 text-primary" />
          <CardTitle className="text-base">Execuții Notification Engine</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {runLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nicio execuție jurnalizată încă.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {runLog.map((r, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  {r.success && r.errorCount === 0 ? (
                    <CheckCircle2 className="size-4 shrink-0 text-primary" />
                  ) : (
                    <AlertTriangle className="size-4 shrink-0 text-destructive" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {fmtTime(r.ranAt)}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        · {r.mode}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.rulesExecuted} reguli · {r.notificationsGenerated} generate ·{' '}
                      {r.pushSent} trimise · {r.pushFailed} eșuate ·{' '}
                      {r.alreadySentSkipped} ignorate
                    </p>
                    {r.errors.length > 0 && (
                      <p className="mt-0.5 text-xs text-destructive">
                        {r.errors.map((e) => `${e.ruleId}: ${e.message}`).join(' · ')}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Istoric notificări */}
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <div className="flex items-center gap-2">
            <Bell className="size-5 text-primary" />
            <CardTitle className="text-base">Istoric notificări</CardTitle>
          </div>
          <Link
            href="/admin/notifications"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Send className="size-3.5" />
            Trimite / testează
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nicio notificare trimisă încă.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.key} className="flex flex-col gap-0.5 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-foreground">
                      {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {fmtTime(n.sentAt)}
                    </span>
                  </div>
                  <p className="line-clamp-1 text-xs text-muted-foreground">{n.body}</p>
                  <span className="text-[11px] text-muted-foreground">
                    {n.recipientType === 'all'
                      ? 'Toți utilizatorii'
                      : `${n.recipientCount} destinatar(i)`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone?: 'good' | 'bad'
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-card p-3">
      <span
        className={
          'text-lg font-bold ' +
          (tone === 'bad'
            ? 'text-destructive'
            : tone === 'good'
              ? 'text-primary'
              : 'text-foreground')
        }
      >
        {value}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
