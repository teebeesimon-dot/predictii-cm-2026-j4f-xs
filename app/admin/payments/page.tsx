'use client'

import { useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useEdition } from '@/components/edition-provider'
import { useAllPredictions, useGroups, useMatches, useStagePayments, useUsers } from '@/lib/hooks'
import {
  hasEditionAccess,
  isDedicatedAdmin,
  isViewOnly,
  type AppUser,
  type StagePayment,
} from '@/lib/types'
import { stagesForEdition } from '@/lib/stages'
import {
  setStagePaymentAmount,
  setStagePaymentStatus,
  setStagePrizeAllocation,
} from '@/lib/data'
import { calculatePrizeSummary } from '@/lib/prizes'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Check, CircleDollarSign, Loader2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const money = new Intl.NumberFormat('ro-RO', {
  style: 'currency',
  currency: 'RON',
  maximumFractionDigits: 2,
})

export default function AdminPaymentsPage() {
  return (
    <AppShell requireAdmin>
      <AdminPaymentsContent />
    </AppShell>
  )
}

function AdminPaymentsContent() {
  const { edition, editionId } = useEdition()
  const { data: users, isLoading: usersLoading } = useUsers()
  const { data: groups, isLoading: groupsLoading } = useGroups()
  const { data: matches, isLoading: matchesLoading } = useMatches()
  const { data: predictions, isLoading: predictionsLoading } = useAllPredictions()
  const { data: payments, isLoading: paymentsLoading, mutate } = useStagePayments()
  const stages = useMemo(() => stagesForEdition(editionId), [editionId])
  const stageIds = useMemo(() => stages.map((stage) => stage.id), [stages])
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null)
  const [savingStage, setSavingStage] = useState<number | null>(null)
  const [savingAllocation, setSavingAllocation] = useState<number | null>(null)
  const [savingUser, setSavingUser] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<number, string>>({})
  const [stagePrizeShares, setStagePrizeShares] = useState<Record<number, string>>({})
  const [finalPrizeShares, setFinalPrizeShares] = useState<Record<number, string>>({})

  const bilkaVipGroup = useMemo(
    () => (groups ?? []).find((group) => group.name.trim().toLocaleLowerCase('ro') === 'bilka vip'),
    [groups],
  )

  const participants = useMemo(
    () =>
      (users ?? [])
        .filter((user) => !isDedicatedAdmin(user) && !isViewOnly(user))
        .filter((user) => hasEditionAccess(user, editionId))
        .filter((user) => bilkaVipGroup?.members.includes(user.id) ?? false)
        .sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username, 'ro')),
    [users, editionId, bilkaVipGroup],
  )

  const paymentByStage = useMemo(
    () => new Map((payments ?? []).map((payment) => [payment.stageId, payment])),
    [payments],
  )

  const prizeSummary = useMemo(
    () =>
      users && matches && predictions && payments
        ? calculatePrizeSummary(users, matches, predictions, payments, stageIds)
        : null,
    [users, matches, predictions, payments, stageIds],
  )

  function amountFor(stageId: number, payment?: StagePayment) {
    return amounts[stageId] ?? (payment?.amount ? String(payment.amount) : '')
  }

  function stagePrizeFor(stageId: number, payment?: StagePayment) {
    return stagePrizeShares[stageId] ?? (payment?.stagePrizePerPayment ? String(payment.stagePrizePerPayment) : '')
  }

  function finalPrizeFor(stageId: number, payment?: StagePayment) {
    return finalPrizeShares[stageId] ?? (payment?.finalPrizePerPayment ? String(payment.finalPrizePerPayment) : '')
  }

  async function saveAmount(stageId: number) {
    const value = Number.parseFloat(amountFor(stageId, paymentByStage.get(stageId)))
    if (!Number.isFinite(value) || value < 0) {
      toast.error('Introdu o sumă validă, egală sau mai mare decât zero.')
      return
    }

    setSavingStage(stageId)
    try {
      await setStagePaymentAmount(editionId, stageId, value)
      await mutate()
      toast.success(`Taxa pentru Etapa ${stageId} a fost salvată.`)
    } catch (error) {
      console.error(error)
      toast.error('Nu am putut salva taxa pentru etapă.')
    } finally {
      setSavingStage(null)
    }
  }

  async function saveAllocation(stageId: number) {
    const payment = paymentByStage.get(stageId)
    const fee = Number.parseFloat(amountFor(stageId, payment))
    const stagePrize = Number.parseFloat(stagePrizeFor(stageId, payment) || '0')
    const finalPrize = Number.parseFloat(finalPrizeFor(stageId, payment) || '0')
    if (![fee, stagePrize, finalPrize].every((value) => Number.isFinite(value) && value >= 0)) {
      toast.error('Introdu valori valide, egale sau mai mari decât zero.')
      return
    }
    if (stagePrize + finalPrize > fee) {
      toast.error('Premiul etapei și clasamentul final nu pot depăși taxa pe etapă.')
      return
    }

    setSavingAllocation(stageId)
    try {
      await setStagePrizeAllocation(editionId, stageId, stagePrize, finalPrize)
      await mutate()
      toast.success(`Împărțirea taxei pentru Etapa ${stageId} a fost salvată.`)
    } catch (error) {
      console.error(error)
      toast.error('Nu am putut salva împărțirea taxei.')
    } finally {
      setSavingAllocation(null)
    }
  }

  async function togglePaid(stageId: number, user: AppUser, paid: boolean) {
    const key = `${stageId}:${user.id}`
    setSavingUser(key)
    try {
      await setStagePaymentStatus(editionId, stageId, user.id, paid)
      await mutate()
    } catch (error) {
      console.error(error)
      toast.error('Nu am putut actualiza statusul plății.')
    } finally {
      setSavingUser(null)
    }
  }

  const selectedStage = stages.find((stage) => stage.id === selectedStageId) ?? stages[0]
  const loading = usersLoading || groupsLoading || matchesLoading || predictionsLoading || paymentsLoading

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold">Plăți pe etape</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configurează taxa, împarte suma per plătitor între premiul etapei și clasamentul final și marchează manual participanții care au plătit.
          Datele sunt vizibile și editabile doar în administrare.
        </p>
        <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
          Editezi: <span className="font-bold text-foreground">{edition.label}</span>
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CircleDollarSign className="size-4" />
            Sumar ediție
          </CardTitle>
          <CardDescription>
            {participants.length} participanți eligibili · {stages.length} etape
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryItem label="Taxe încasate" value={money.format(prizeSummary?.collected ?? 0)} />
          <SummaryItem label="Premii etape" value={money.format(prizeSummary?.stagePrizes ?? 0)} />
          <SummaryItem label="Fond clasament final" value={money.format(prizeSummary?.finalPrize ?? 0)} />
          <SummaryItem label="Etape configurate" value={`${(payments ?? []).filter((p) => p.amount > 0).length}/${stages.length}`} />
        </CardContent>
        {prizeSummary && prizeSummary.stagePrizes > prizeSummary.collected ? (
          <p className="px-6 pb-5 text-sm text-destructive">
            Premiile etapelor depășesc taxele încasate cu {money.format(prizeSummary.stagePrizes - prizeSummary.collected)}. Premiul final este afișat ca zero până când fondul este acoperit.
          </p>
        ) : (
          <p className="px-6 pb-5 text-sm text-muted-foreground">
            Pentru fiecare plătitor, taxa este împărțită între premiul etapei și fondul clasamentului final. Orice diferență nealocată rămâne în afara fondului de premiere.
          </p>
        )}
      </Card>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:max-w-sm">
          <Label htmlFor="payment-stage-select">Etapă</Label>
          <select id="payment-stage-select" value={selectedStage?.id ?? ''} onChange={(event) => setSelectedStageId(Number(event.target.value))} className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm" disabled={!stages.length}>
            {stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.name} ({stage.short}) — {stage.label}</option>)}
          </select>
        </div>
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          stages.filter((stage) => stage.id === selectedStage?.id).map((stage) => {
            const payment = paymentByStage.get(stage.id)
            const paidIds = new Set(payment?.paidUserIds ?? [])
            const paidCount = participants.filter((user) => paidIds.has(user.id)).length
            return (
              <Card key={stage.id}>
                <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      {stage.name}
                      <Badge variant="outline">{stage.short}</Badge>
                    </CardTitle>
                    <CardDescription className="mt-1">{stage.label}</CardDescription>
                  </div>
                  <div className="flex flex-wrap items-end justify-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`amount-${stage.id}`} className="text-xs">Taxă (RON)</Label>
                      <Input
                        id={`amount-${stage.id}`}
                        className="w-28"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0"
                        value={amountFor(stage.id, payment)}
                        onChange={(event) =>
                          setAmounts((current) => ({ ...current, [stage.id]: event.target.value }))
                        }
                      />
                    </div>
                    <Button type="button" onClick={() => saveAmount(stage.id)} disabled={savingStage === stage.id}>
                      {savingStage === stage.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Salvează taxa
                    </Button>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`stage-prize-${stage.id}`} className="text-xs">Premiu etapă / plătitor (RON)</Label>
                      <Input
                        id={`stage-prize-${stage.id}`}
                        className="w-32"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0"
                        value={stagePrizeFor(stage.id, payment)}
                        onChange={(event) =>
                          setStagePrizeShares((current) => ({ ...current, [stage.id]: event.target.value }))
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`final-prize-${stage.id}`} className="text-xs">Clasament final / plătitor (RON)</Label>
                      <Input
                        id={`final-prize-${stage.id}`}
                        className="w-32"
                        type="number"
                        min="0"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0"
                        value={finalPrizeFor(stage.id, payment)}
                        onChange={(event) =>
                          setFinalPrizeShares((current) => ({ ...current, [stage.id]: event.target.value }))
                        }
                      />
                    </div>
                    <Button type="button" variant="secondary" onClick={() => saveAllocation(stage.id)} disabled={savingAllocation === stage.id}>
                      {savingAllocation === stage.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Salvează împărțirea
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Users className="size-4" />
                      {paidCount} din {participants.length} plătiți
                    </span>
                    <span>
                      Fond etapă:{' '}
                      <strong className="text-foreground">{money.format(prizeSummary?.stages.find((item) => item.stageId === stage.id)?.configuredPrize ?? 0)}</strong>
                    </span>
                    <span>
                      Fond final:{' '}
                      <strong className="text-foreground">{money.format(prizeSummary?.stages.find((item) => item.stageId === stage.id)?.finalContribution ?? 0)}</strong>
                    </span>
                    {(() => {
                      const result = prizeSummary?.stages.find((item) => item.stageId === stage.id)
                      return result && result.winners.length > 0 ? (
                        <span>
                          Câștigător: <strong className="text-foreground">{result.winners.map((winner) => winner.name).join(', ')}</strong>
                          {' · '}{money.format(result.prizePerWinner)} / persoană
                        </span>
                      ) : null
                    })()}
                  </div>
                  {!bilkaVipGroup ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-sm text-destructive">Nu am găsit grupa „BILKA VIP” pentru această ediție. Verifică denumirea grupei în Administrare → Grupe.</p>
                  ) : participants.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                      Nu există participanți eligibili pentru această ediție.
                    </p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {participants.map((user) => {
                        const paid = paidIds.has(user.id)
                        const key = `${stage.id}:${user.id}`
                        return (
                          <button
                            key={user.id}
                            type="button"
                            aria-pressed={paid}
                            disabled={savingUser === key}
                            onClick={() => togglePaid(stage.id, user, !paid)}
                            className={cn(
                              'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                              paid
                                ? 'border-primary/50 bg-primary/10'
                                : 'border-border bg-card hover:bg-secondary',
                            )}
                          >
                            <span className="min-w-0 truncate font-medium">{user.name || user.username}</span>
                            {savingUser === key ? (
                              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                            ) : paid ? (
                              <Badge variant="default">Plătit</Badge>
                            ) : (
                              <Badge variant="outline">Neplătit</Badge>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary/50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold">{value}</p>
    </div>
  )
}
