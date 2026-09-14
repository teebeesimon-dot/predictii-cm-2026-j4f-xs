'use client'

import { useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useEdition } from '@/components/edition-provider'
import { useStagePayments, useUsers } from '@/lib/hooks'
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
} from '@/lib/data'
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
  const { data: payments, isLoading: paymentsLoading, mutate } = useStagePayments()
  const stages = stagesForEdition(editionId)
  const [savingStage, setSavingStage] = useState<number | null>(null)
  const [savingUser, setSavingUser] = useState<string | null>(null)
  const [amounts, setAmounts] = useState<Record<number, string>>({})

  const participants = useMemo(
    () =>
      (users ?? [])
        .filter((user) => !isDedicatedAdmin(user) && !isViewOnly(user))
        .filter((user) => hasEditionAccess(user, editionId))
        .sort((a, b) =>
          (a.name || a.username).localeCompare(b.name || b.username, 'ro'),
        ),
    [users, editionId],
  )

  const paymentByStage = useMemo(
    () => new Map((payments ?? []).map((payment) => [payment.stageId, payment])),
    [payments],
  )

  function amountFor(stageId: number, payment?: StagePayment) {
    return amounts[stageId] ?? (payment?.amount ? String(payment.amount) : '')
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

  const loading = usersLoading || paymentsLoading

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-bold">Plăți pe etape</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Configurează taxa și marchează manual participanții care au plătit pentru fiecare etapă.
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
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <SummaryItem label="Taxe configurate" value={`${(payments ?? []).filter((p) => p.amount > 0).length}/${stages.length}`} />
          <SummaryItem label="Plăți înregistrate" value={String(new Set((payments ?? []).flatMap((p) => p.paidUserIds)).size)} />
          <SummaryItem label="Total configurat" value={money.format((payments ?? []).reduce((sum, p) => sum + (p.amount || 0), 0))} />
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4">
        {loading ? (
          <Skeleton className="h-72 w-full" />
        ) : (
          stages.map((stage) => {
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
                  <div className="flex items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor={`amount-${stage.id}`} className="text-xs">Taxă (RON)</Label>
                      <Input
                        id={`amount-${stage.id}`}
                        className="w-32"
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
                    <Button
                      type="button"
                      onClick={() => saveAmount(stage.id)}
                      disabled={savingStage === stage.id}
                    >
                      {savingStage === stage.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                      Salvează
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="size-4" />
                    {paidCount} din {participants.length} plătiți
                  </div>
                  {participants.length === 0 ? (
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
