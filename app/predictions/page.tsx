'use client'

import { useMemo, useState, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUserPredictions } from '@/lib/hooks'
import { savePrediction, PredictionLockedError } from '@/lib/data'
import {
  STAGES,
  isLocked,
  STAGE_DEADLINES,
  KNOCKOUT_ROUNDS,
  KNOCKOUT_DEADLINES,
  type Match,
  type StageId,
} from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DeadlineBanner } from '@/components/deadline-banner'
import { formatKickoff } from '@/lib/utils'
import { Lock, Save, Loader2, Flag } from 'lucide-react'
import { toast } from 'sonner'

type Entry = { home: string; away: string }

export default function PredictionsPage() {
  return (
    <AppShell>
      <PredictionsContent />
    </AppShell>
  )
}

function PredictionsContent() {
  const { user } = useAuth()
  const { data: matches, isLoading, mutate: refreshMatches } = useMatches()
  const { data: predictions, mutate } = useUserPredictions(user?.id)

  const [entries, setEntries] = useState<Record<string, Entry>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  // seed entries from saved predictions
  useEffect(() => {
    if (!predictions) return
    setEntries((prev) => {
      const next = { ...prev }
      for (const p of predictions) {
        if (next[p.matchId] === undefined) {
          next[p.matchId] = { home: String(p.homeScore), away: String(p.awayScore) }
        }
      }
      return next
    })
  }, [predictions])

  const byStage = useMemo(() => {
    const map = new Map<StageId, Match[]>()
    for (const m of matches ?? []) {
      const arr = map.get(m.stage) ?? []
      arr.push(m)
      map.set(m.stage, arr)
    }
    return map
  }, [matches])

  function setEntry(matchId: string, field: 'home' | 'away', value: string) {
    const clean = value.replace(/[^0-9]/g, '').slice(0, 2)
    setEntries((e) => ({
      ...e,
      [matchId]: { home: '', away: '', ...e[matchId], [field]: clean },
    }))
  }

  async function handleSave(match: Match) {
    if (!user) return
    const entry = entries[match.id]
    if (!entry || entry.home === '' || entry.away === '') {
      toast.error('Completează ambele scoruri.')
      return
    }
    setSaving((s) => ({ ...s, [match.id]: true }))
    try {
      await savePrediction(user.id, match.id, Number(entry.home), Number(entry.away))
      await mutate()
      toast.success('Pronostic salvat!')
    } catch (err) {
      if (err instanceof PredictionLockedError) {
        toast.error(err.message)
        await refreshMatches()
      } else {
        toast.error('Eroare la salvare.')
      }
    } finally {
      setSaving((s) => ({ ...s, [match.id]: false }))
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Pronosticuri</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Completează scorurile. Fiecare etapă se blochează automat la termenul
          limită afișat (ora României).
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (matches?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Flag className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Nu există meciuri momentan. Administratorul le va adăuga în curând.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="1">
          <TabsList className="flex w-full flex-wrap">
            {STAGES.map((s) => (
              <TabsTrigger key={s.id} value={String(s.id)} className="flex-1">
                {s.short}
              </TabsTrigger>
            ))}
          </TabsList>

          {STAGES.map((s) => {
            const stageMatches = (byStage.get(s.id as StageId) ?? []).sort(
              (a, b) => +new Date(a.kickoff) - +new Date(b.kickoff),
            )
            const stageDeadline =
              s.id === 5 ? null : STAGE_DEADLINES[s.id as 1 | 2 | 3 | 4]
            return (
              <TabsContent key={s.id} value={String(s.id)} className="mt-4">
                <p className="mb-3 text-sm font-medium text-muted-foreground">
                  {s.label}
                </p>

                {s.id !== 5 && (
                  <div className="mb-4">
                    <DeadlineBanner
                      deadline={stageDeadline}
                      label="Completează până la"
                    />
                  </div>
                )}

                {stageMatches.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
                    Niciun meci în această etapă.
                  </p>
                ) : s.id === 5 ? (
                  // Etapa 5: grupăm pe runde eliminatorii, fiecare cu termenul ei.
                  <div className="flex flex-col gap-6">
                    {KNOCKOUT_ROUNDS.map(({ round, label }) => {
                      const roundMatches = stageMatches.filter(
                        (m) => m.round === round,
                      )
                      return (
                        <div key={round} className="flex flex-col gap-3">
                          <h3 className="font-heading text-base font-bold">
                            {label}
                          </h3>
                          <DeadlineBanner
                            deadline={KNOCKOUT_DEADLINES[round]}
                            label="Completează până la"
                          />
                          {roundMatches.length === 0 ? (
                            <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                              Meciurile vor fi adăugate după stabilirea echipelor
                              calificate.
                            </p>
                          ) : (
                            roundMatches.map((m) => (
                              <MatchRow
                                key={m.id}
                                match={m}
                                entry={entries[m.id]}
                                saving={!!saving[m.id]}
                                onChange={setEntry}
                                onSave={handleSave}
                              />
                            ))
                          )}
                        </div>
                      )
                    })}
                    {/* meciuri din Etapa 5 fără rundă atribuită */}
                    {stageMatches.filter((m) => !m.round).length > 0 && (
                      <div className="flex flex-col gap-3">
                        <h3 className="font-heading text-base font-bold">
                          Alte meciuri
                        </h3>
                        {stageMatches
                          .filter((m) => !m.round)
                          .map((m) => (
                            <MatchRow
                              key={m.id}
                              match={m}
                              entry={entries[m.id]}
                              saving={!!saving[m.id]}
                              onChange={setEntry}
                              onSave={handleSave}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {stageMatches.map((m) => (
                      <MatchRow
                        key={m.id}
                        match={m}
                        entry={entries[m.id]}
                        saving={!!saving[m.id]}
                        onChange={setEntry}
                        onSave={handleSave}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}

function MatchRow({
  match,
  entry,
  saving,
  onChange,
  onSave,
}: {
  match: Match
  entry: Entry | undefined
  saving: boolean
  onChange: (id: string, field: 'home' | 'away', value: string) => void
  onSave: (m: Match) => void
}) {
  const locked = isLocked(match)
  const hasResult = match.homeScore !== null && match.awayScore !== null

  return (
    <Card className={locked ? 'opacity-90' : ''}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {formatKickoff(match.kickoff)}
          </span>
          {locked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="size-3" /> Blocat
            </Badge>
          ) : (
            <Badge className="bg-primary/15 text-primary">Deschis</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex-1 text-right font-semibold">{match.homeTeam}</span>
          <div className="flex items-center gap-1">
            <Input
              inputMode="numeric"
              aria-label={`Scor ${match.homeTeam}`}
              className="size-12 p-0 text-center font-heading text-lg font-bold"
              value={entry?.home ?? ''}
              disabled={locked}
              onChange={(e) => onChange(match.id, 'home', e.target.value)}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              inputMode="numeric"
              aria-label={`Scor ${match.awayTeam}`}
              className="size-12 p-0 text-center font-heading text-lg font-bold"
              value={entry?.away ?? ''}
              disabled={locked}
              onChange={(e) => onChange(match.id, 'away', e.target.value)}
            />
          </div>
          <span className="flex-1 font-semibold">{match.awayTeam}</span>
        </div>

        <div className="flex items-center justify-between gap-2">
          {hasResult ? (
            <span className="text-xs font-medium text-muted-foreground">
              Rezultat oficial:{' '}
              <span className="font-bold text-foreground">
                {match.homeScore} - {match.awayScore}
              </span>
            </span>
          ) : (
            <span />
          )}
          {!locked && (
            <Button size="sm" onClick={() => onSave(match)} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              Salvează
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
