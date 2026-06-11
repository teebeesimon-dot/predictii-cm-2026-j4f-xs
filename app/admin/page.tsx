'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useMatches } from '@/lib/hooks'
import { createMatch, updateMatchResult } from '@/lib/data'
import { STAGES, isLocked, type Match, type StageId } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatKickoff } from '@/lib/utils'
import { PlusCircle, Save, Loader2, Lock, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminPage() {
  return (
    <AppShell requireAdmin>
      <AdminContent />
    </AppShell>
  )
}

function AdminContent() {
  const { data: matches, isLoading, mutate } = useMatches()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Administrare</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Adaugă meciuri și introdu rezultatele oficiale. Clasamentele se
          recalculează automat.
        </p>
      </div>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Rezultate</TabsTrigger>
          <TabsTrigger value="add">Adaugă meci</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <AddMatchForm onAdded={() => mutate()} />
        </TabsContent>

        <TabsContent value="results" className="mt-4">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (matches?.length ?? 0) === 0 ? (
            <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              Niciun meci adăugat. Folosește tab-ul &quot;Adaugă meci&quot;.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {[...(matches ?? [])]
                .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff))
                .map((m) => (
                  <ResultRow key={m.id} match={m} onSaved={() => mutate()} />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function AddMatchForm({ onAdded }: { onAdded: () => void }) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [stage, setStage] = useState<StageId>(1)
  const [kickoff, setKickoff] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!home.trim() || !away.trim() || !kickoff) {
      toast.error('Completează echipele și data meciului.')
      return
    }
    setSaving(true)
    try {
      await createMatch({
        homeTeam: home.trim(),
        awayTeam: away.trim(),
        stage,
        kickoff: new Date(kickoff).toISOString(),
        homeScore: null,
        awayScore: null,
      })
      toast.success('Meci adăugat!')
      setHome('')
      setAway('')
      setKickoff('')
      onAdded()
    } catch {
      toast.error('Eroare la adăugare.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Meci nou</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="home">Echipa gazdă</Label>
              <Input
                id="home"
                value={home}
                onChange={(e) => setHome(e.target.value)}
                placeholder="ex: România"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="away">Echipa oaspete</Label>
              <Input
                id="away"
                value={away}
                onChange={(e) => setAway(e.target.value)}
                placeholder="ex: Brazilia"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="stage">Etapă</Label>
              <select
                id="stage"
                value={stage}
                onChange={(e) => setStage(Number(e.target.value) as StageId)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="kickoff">Data și ora startului</Label>
              <Input
                id="kickoff"
                type="datetime-local"
                value={kickoff}
                onChange={(e) => setKickoff(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" disabled={saving} className="self-start">
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <PlusCircle className="size-4" />
            )}
            Adaugă meci
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function ResultRow({ match, onSaved }: { match: Match; onSaved: () => void }) {
  const [home, setHome] = useState(
    match.homeScore !== null ? String(match.homeScore) : '',
  )
  const [away, setAway] = useState(
    match.awayScore !== null ? String(match.awayScore) : '',
  )
  const [saving, setSaving] = useState(false)
  const locked = isLocked(match)

  async function save() {
    if (home === '' || away === '') {
      toast.error('Completează ambele scoruri.')
      return
    }
    setSaving(true)
    try {
      await updateMatchResult(match.id, Number(home), Number(away))
      toast.success('Rezultat salvat. Clasamentele s-au actualizat.')
      onSaved()
    } catch {
      toast.error('Eroare la salvare.')
    } finally {
      setSaving(false)
    }
  }

  function clean(v: string) {
    return v.replace(/[^0-9]/g, '').slice(0, 2)
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <Badge variant="secondary">
            {STAGES.find((s) => s.id === match.stage)?.short}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatKickoff(match.kickoff)}
          </span>
          {locked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="size-3" /> Început
            </Badge>
          ) : (
            <Badge className="bg-primary/15 text-primary">Programat</Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="flex-1 text-right font-semibold">{match.homeTeam}</span>
          <Input
            inputMode="numeric"
            aria-label={`Scor oficial ${match.homeTeam}`}
            className="size-12 p-0 text-center font-heading text-lg font-bold"
            value={home}
            onChange={(e) => setHome(clean(e.target.value))}
          />
          <span className="text-muted-foreground">-</span>
          <Input
            inputMode="numeric"
            aria-label={`Scor oficial ${match.awayTeam}`}
            className="size-12 p-0 text-center font-heading text-lg font-bold"
            value={away}
            onChange={(e) => setAway(clean(e.target.value))}
          />
          <span className="flex-1 font-semibold">{match.awayTeam}</span>
        </div>

        <div className="flex justify-end">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : match.homeScore !== null ? (
              <RefreshCw className="size-4" />
            ) : (
              <Save className="size-4" />
            )}
            {match.homeScore !== null ? 'Actualizează rezultatul' : 'Salvează rezultatul'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
