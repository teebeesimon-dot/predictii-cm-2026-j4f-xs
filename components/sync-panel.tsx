'use client'

import { useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle2, AlertTriangle, RadioTower } from 'lucide-react'
import { triggerSync, readSyncStatus } from '@/app/actions/sync'
import type { SyncStatus, SyncResult } from '@/lib/sync-results'

function formatTime(ts: number | null): string {
  if (!ts) return 'niciodată'
  return new Date(ts).toLocaleString('ro-RO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Panou de administrare pentru actualizarea automată a rezultatelor.
export function SyncPanel() {
  const { mutate } = useSWRConfig()
  const [status, setStatus] = useState<SyncStatus | null>(null)
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)

  useEffect(() => {
    let active = true
    readSyncStatus()
      .then((s) => active && setStatus(s))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  async function handleSyncNow() {
    setRunning(true)
    try {
      // force: ignoră throttle-ul ca adminul să poată forța oricând o verificare.
      const res = await triggerSync({ includeLive: true, force: true })
      setStatus(res.status)
      if (res.result) {
        setLastResult(res.result)
        if (!res.result.ok) {
          toast.error(res.result.message)
        } else if (res.result.updated > 0) {
          toast.success(`Actualizat ${res.result.updated} meci(uri).`)
          // Reîmprospătează datele ca toate paginile să reflecte noile scoruri.
          await mutate('matches')
        } else {
          toast.info('Niciun scor nou de actualizat.')
        }
      }
    } catch {
      toast.error('Eroare la sincronizare.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RadioTower className="size-4 text-primary" />
            Actualizare automată a rezultatelor
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-pretty text-sm text-muted-foreground">
            Rezultatele se preiau gratuit de la football-data.org (FIFA World
            Cup). Scorurile se actualizează automat la fiecare 10 minute în
            timpul meciurilor, iar clasamentele, statisticile și premiile se
            recalculează singure.
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Ultima verificare</p>
              <p className="font-medium">{formatTime(status?.lastRunAt ?? null)}</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <p className="text-xs text-muted-foreground">Stare</p>
              {status?.lastError ? (
                <p className="flex items-center gap-1 font-medium text-destructive">
                  <AlertTriangle className="size-4" />
                  Eroare
                </p>
              ) : (
                <p className="flex items-center gap-1 font-medium text-primary">
                  <CheckCircle2 className="size-4" />
                  {status?.lastMessage ?? 'În așteptare'}
                </p>
              )}
            </div>
          </div>

          {status?.lastError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {status.lastError}
            </div>
          ) : null}

          {lastResult && lastResult.ok && lastResult.changes.length > 0 ? (
            <div className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Ultimele actualizări</p>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                {lastResult.changes.map((c) => (
                  <li key={c.matchId} className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {c.toHome}–{c.toAway}
                    </Badge>
                    <span>
                      {c.homeTeam} – {c.awayTeam}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <Button onClick={handleSyncNow} disabled={running} className="self-start">
            <RefreshCw className={running ? 'size-4 animate-spin' : 'size-4'} />
            {running ? 'Se sincronizează...' : 'Sincronizează acum'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Cron extern gratuit (la fiecare 10 minute)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p>
            Pentru actualizare automată chiar și când nimeni nu are aplicația
            deschisă, configurează un cron gratuit (ex.{' '}
            <span className="font-medium text-foreground">cron-job.org</span>)
            care să apeleze acest URL la fiecare 10 minute:
          </p>
          <code className="block overflow-x-auto rounded-lg border border-border bg-muted p-3 text-xs text-foreground">
            {typeof window !== 'undefined'
              ? `${window.location.origin}/api/sync-results?secret=CRON_SECRET&includeLive=1`
              : '/api/sync-results?secret=CRON_SECRET&includeLive=1'}
          </code>
          <p>
            Înlocuiește <span className="font-medium text-foreground">CRON_SECRET</span>{' '}
            cu valoarea secretului setat în variabilele de mediu. Poți folosi și
            header-ul <span className="font-mono text-foreground">x-sync-secret</span>{' '}
            în loc de parametrul din URL.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
