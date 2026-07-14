'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Cpu,
  Play,
  Send,
  ArrowLeft,
  Loader2,
  Clock,
  ListChecks,
  Bell,
  CopyX,
  History,
} from 'lucide-react'
import type {
  EngineRunMode,
  EngineRunResult,
  NotificationTask,
} from '@/lib/notifications/types'

export default function NotificationEnginePage() {
  return (
    <AppShell requireAdmin>
      <NotificationEngineContent />
    </AppShell>
  )
}

function NotificationEngineContent() {
  const { user } = useAuth()
  const [running, setRunning] = useState<EngineRunMode | null>(null)
  const [result, setResult] = useState<EngineRunResult | null>(null)

  async function handleRun(mode: EngineRunMode) {
    if (mode === 'live') {
      const ok = window.confirm(
        'Live Run: notificările vor fi TRIMISE efectiv și salvate în istoric ' +
          '(nu vor mai fi retrimise). Continui?',
      )
      if (!ok) return
    }
    setRunning(mode)
    try {
      const res = await fetch('/api/admin/notification-engine/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: user?.id, mode }),
      })
      const data = (await res.json().catch(() => ({}))) as EngineRunResult & {
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la rularea engine-ului.')
      }
      setResult(data)
      if (mode === 'live') {
        toast.success(
          `Live Run: ${data.dispatched} trimise · ${data.pushSent} push · ` +
            `${data.alreadySentSkipped} deja trimise (sărite).`,
        )
      } else {
        toast.success(
          `Dry Run: ${data.notifications.length} de trimis · ` +
            `${data.duplicatesRemoved} duplicate · ${data.alreadySentSkipped} deja trimise.`,
        )
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Înapoi la Administrare
        </Link>
        <h1 className="flex items-center gap-2 font-heading text-3xl font-bold tracking-tight">
          <Cpu className="size-7 text-primary" />
          Notification Engine
        </h1>
        <p className="mt-1 text-pretty text-muted-foreground">
          Rulează engine-ul de notificări. <strong>Dry Run</strong> doar
          generează notificările (fără efecte). <strong>Live Run</strong> le
          trimite și le salvează în istoric, ca să nu fie retrimise.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <CardTitle>Ultima rulare</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => handleRun('dry-run')}
              disabled={running !== null}
            >
              {running === 'dry-run' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Play className="size-4" />
              )}
              Dry Run
            </Button>
            <Button
              onClick={() => handleRun('live')}
              disabled={running !== null}
            >
              {running === 'live' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Live Run
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {!result ? (
            <p className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
              Nicio rulare încă. Apasă „Dry Run" (fără efecte) sau „Live Run"
              (trimite) pentru a executa engine-ul.
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span
                  className={
                    result.mode === 'live'
                      ? 'rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground'
                      : 'rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground'
                  }
                >
                  {result.mode === 'live' ? 'LIVE RUN' : 'DRY RUN'}
                </span>
                <span className="text-xs text-muted-foreground">
                  Rulat la {new Date(result.ranAt).toLocaleString('ro-RO')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Metric
                  icon={<Clock className="size-4" />}
                  label="Durata"
                  value={`${result.executionTime} ms`}
                />
                <Metric
                  icon={<ListChecks className="size-4" />}
                  label="Reguli executate"
                  value={String(result.rulesExecuted)}
                />
                <Metric
                  icon={<Bell className="size-4" />}
                  label="Generate"
                  value={String(result.notificationsGenerated)}
                />
                <Metric
                  icon={<CopyX className="size-4" />}
                  label="Duplicate eliminate"
                  value={String(result.duplicatesRemoved)}
                />
                <Metric
                  icon={<History className="size-4" />}
                  label="Deja trimise (sărite)"
                  value={String(result.alreadySentSkipped)}
                />
                <Metric
                  icon={<Send className="size-4" />}
                  label="Trimise (live)"
                  value={String(result.dispatched)}
                />
                <Metric
                  icon={<Bell className="size-4" />}
                  label="Push reușite"
                  value={String(result.pushSent)}
                />
                <Metric
                  icon={<CopyX className="size-4" />}
                  label="Push eșuate"
                  value={String(result.pushFailed)}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                {result.notifications.length} de trimis ·{' '}
                {result.invalidRemoved} invalide eliminate
              </p>

              {result.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
                  <p className="mb-1 font-medium text-destructive">
                    Erori la reguli:
                  </p>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {result.errors.map((err) => (
                      <li key={err.ruleId}>
                        <span className="font-mono">{err.ruleId}</span>:{' '}
                        {err.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.ruleResults.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold">
                    Reguli executate ({result.ruleResults.length})
                  </h2>
                  <ul className="flex flex-col gap-1.5">
                    {result.ruleResults.map((r) => (
                      <li
                        key={r.ruleId}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      >
                        <span className="min-w-0">
                          <span className="font-mono text-xs text-primary">
                            {r.ruleId}
                          </span>
                          {r.description ? (
                            <span className="block truncate text-xs text-muted-foreground">
                              {r.description}
                            </span>
                          ) : null}
                        </span>
                        <span
                          className={
                            r.failed
                              ? 'shrink-0 rounded bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive'
                              : 'shrink-0 rounded bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground'
                          }
                        >
                          {r.failed ? 'eroare' : `${r.generated} generate`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.skipped.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h2 className="text-sm font-semibold">
                    Notificări ignorate ({result.skipped.length})
                  </h2>
                  <ul className="flex flex-col gap-1.5">
                    {result.skipped.map((s) => (
                      <li
                        key={s.key}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 truncate">
                          <span className="font-mono text-xs text-muted-foreground">
                            {s.type}
                          </span>
                          <span className="block truncate">{s.title}</span>
                        </span>
                        <span className="shrink-0 rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                          {s.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold">
                  {result.mode === 'live'
                    ? `Notificări trimise (${result.notifications.length})`
                    : `Notificări de trimis (${result.notifications.length})`}
                </h2>
                {result.notifications.length === 0 ? (
                  <p className="rounded-lg border border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
                    Nicio notificare de trimis. (Nu există reguli active care să
                    producă notificări noi momentan.)
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {result.notifications.map((task) => (
                      <TaskRow key={task.id} task={task} />
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg border border-border bg-secondary/40 p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
    </div>
  )
}

function TaskRow({ task }: { task: NotificationTask }) {
  return (
    <li className="rounded-lg border border-border bg-card p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary">
          {task.type}
        </span>
        <span className="text-xs text-muted-foreground">
          {task.recipientType === 'all'
            ? 'toți'
            : `${task.recipientIds.length} destinatar(i)`}{' '}
          · {task.priority}
        </span>
      </div>
      <p className="mt-1.5 font-medium">{task.title}</p>
      <p className="text-sm text-muted-foreground">{task.body}</p>
    </li>
  )
}
