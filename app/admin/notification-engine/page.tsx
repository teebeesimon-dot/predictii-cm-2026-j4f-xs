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
  ArrowLeft,
  Loader2,
  Clock,
  ListChecks,
  Bell,
  CopyX,
} from 'lucide-react'
import type { EngineRunResult, NotificationTask } from '@/lib/notifications/types'

export default function NotificationEnginePage() {
  return (
    <AppShell requireAdmin>
      <NotificationEngineContent />
    </AppShell>
  )
}

function NotificationEngineContent() {
  const { user } = useAuth()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<EngineRunResult | null>(null)

  async function handleRun() {
    setRunning(true)
    try {
      const res = await fetch('/api/admin/notification-engine/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: user?.id }),
      })
      const data = (await res.json().catch(() => ({}))) as EngineRunResult & {
        error?: string
      }
      if (!res.ok) {
        throw new Error(data.error || 'Eroare la rularea engine-ului.')
      }
      setResult(data)
      toast.success(
        `Engine rulat: ${data.notificationsGenerated} generate, ` +
          `${data.duplicatesRemoved} duplicate eliminate.`,
      )
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setRunning(false)
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
          Rulează engine-ul de notificări. Acesta DOAR decide ce notificări ar
          trebui trimise — nu trimite nimic.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>Ultima rulare</CardTitle>
          <Button onClick={handleRun} disabled={running}>
            {running ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Play className="size-4" />
            )}
            Rulează acum
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {!result ? (
            <p className="rounded-lg border border-dashed border-border bg-secondary/30 p-6 text-center text-sm text-muted-foreground">
              Nicio rulare încă. Apasă „Rulează acum" pentru a executa engine-ul.
            </p>
          ) : (
            <>
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
              </div>

              <p className="text-xs text-muted-foreground">
                Rulat la {new Date(result.ranAt).toLocaleString('ro-RO')} ·{' '}
                {result.notifications.length} notificări valide ·{' '}
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

              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-semibold">
                  Notificări generate ({result.notifications.length})
                </h2>
                {result.notifications.length === 0 ? (
                  <p className="rounded-lg border border-border bg-secondary/30 p-4 text-center text-sm text-muted-foreground">
                    Nicio notificare generată. (Nu există reguli active care să
                    producă notificări momentan.)
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
