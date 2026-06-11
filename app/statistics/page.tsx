'use client'

import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useAllPredictions, useUsers } from '@/lib/hooks'
import { computeStandings } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Target, CheckCircle2, Percent, ListChecks } from 'lucide-react'

export default function StatisticsPage() {
  return (
    <AppShell>
      <StatisticsContent />
    </AppShell>
  )
}

function StatisticsContent() {
  const { user } = useAuth()
  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()

  const loading = l1 || l2 || l3
  const ready = users && matches && predictions

  const myRow = ready
    ? computeStandings(users, matches, predictions, undefined, {
        id: user?.id,
        isAdmin: user?.isAdmin,
      }).find((r) => r.userId === user?.id)
    : undefined

  const scored = myRow ? myRow.exact + myRow.correct1x2 : 0
  const successPct = myRow && myRow.predicted > 0 ? (scored / myRow.predicted) * 100 : 0
  const exactPct = myRow && myRow.predicted > 0 ? (myRow.exact / myRow.predicted) * 100 : 0

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Statistici</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Precizia pronosticurilor tale pe meciurile încheiate.
        </p>
      </div>

      {loading || !ready ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <BigStat
              label="Scoruri exacte"
              value={String(myRow?.exact ?? 0)}
              hint="3 puncte fiecare"
              icon={Target}
              accent
            />
            <BigStat
              label="Rezultate 1X2 corecte"
              value={String(myRow?.correct1x2 ?? 0)}
              hint="1 punct fiecare"
              icon={CheckCircle2}
            />
            <BigStat
              label="Procent reușită"
              value={`${successPct.toFixed(0)}%`}
              hint={`din ${myRow?.predicted ?? 0} pronosticuri`}
              icon={Percent}
            />
            <BigStat
              label="Total puncte"
              value={String(myRow?.points ?? 0)}
              hint="punctaj general"
              icon={ListChecks}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalii precizie</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <Bar label="Reușită totală (exact + 1X2)" pct={successPct} />
              <Bar label="Procent scoruri exacte" pct={exactPct} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Regulament punctaj</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <RuleCard points="3" label="Scor exact" desc="Ai nimerit scorul exact." />
              <RuleCard
                points="1"
                label="Rezultat corect (1X2)"
                desc="Ai nimerit câștigătorul / egalul."
              />
              <RuleCard points="0" label="Greșit" desc="Pronostic incorect." />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function BigStat({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  hint: string
  icon: React.ElementType
  accent?: boolean
}) {
  return (
    <Card className={accent ? 'border-primary/40' : ''}>
      <CardContent className="flex flex-col gap-2 p-5">
        <div
          className={
            'flex size-10 items-center justify-center rounded-lg ' +
            (accent ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary')
          }
        >
          <Icon className="size-5" />
        </div>
        <p className="font-heading text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  )
}

function Bar({ label, pct }: { label: string; pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-heading font-bold tabular-nums">{clamped.toFixed(0)}%</span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

function RuleCard({
  points,
  label,
  desc,
}: {
  points: string
  label: string
  desc: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary font-heading text-lg font-bold text-primary-foreground">
        {points}
      </div>
      <div>
        <p className="font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  )
}
