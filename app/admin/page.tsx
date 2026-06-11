'use client'

import { useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import {
  createMatch,
  deleteMatch,
  updateMatchResult,
  createUser,
  deleteUser,
  updateUserPassword,
  seedUsersIfEmpty,
  seedGroupMatchesIfEmpty,
  fixPlayoffTeamNames,
  resyncMatchTeams,
  computeStandings,
} from '@/lib/data'
import { WC2026_GROUP_MATCHES } from '@/lib/wc2026-schedule'
import {
  STAGES,
  isLocked,
  KNOCKOUT_ROUNDS,
  type Match,
  type StageId,
  type KnockoutRound,
  type AppUser,
} from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { formatKickoff } from '@/lib/utils'
import {
  PlusCircle,
  Save,
  Loader2,
  Lock,
  RefreshCw,
  Trash2,
  KeyRound,
  UserPlus,
  Users,
  Download,
  FileSpreadsheet,
} from 'lucide-react'
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
  const { data: users, isLoading: usersLoading, mutate: mutateUsers } = useUsers()
  const { data: predictions } = useAllPredictions()
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    if (!users || !matches || !predictions) {
      toast.error('Datele nu sunt încă încărcate.')
      return
    }
    setExporting(true)
    try {
      const standings = computeStandings(users, matches, predictions)
      const rows = standings.map((r) => ({
        Pozitie: r.rank,
        Nume: r.name,
        Puncte: r.points,
        'Scoruri exacte': r.exact,
        '1X2 corecte': r.correct1x2,
        'Meciuri jucate': r.played,
      }))
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(rows)
      ws['!cols'] = [
        { wch: 8 },
        { wch: 24 },
        { wch: 8 },
        { wch: 14 },
        { wch: 12 },
        { wch: 14 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Clasament')
      XLSX.writeFile(wb, 'clasament-j4f.xlsx')
      toast.success('Clasamentul a fost exportat.')
    } catch {
      toast.error('Eroare la exportul Excel.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Administrare</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Adaugă meciuri, introdu rezultatele oficiale și gestionează conturile.
            Clasamentele se recalculează automat.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={exporting || !users || !matches || !predictions}
          className="shrink-0"
        >
          {exporting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="size-4" />
          )}
          Export Clasament Excel
        </Button>
      </div>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">Rezultate</TabsTrigger>
          <TabsTrigger value="add">Adaugă meci</TabsTrigger>
          <TabsTrigger value="users">Participanți</TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="mt-4">
          <div className="flex flex-col gap-4">
            <SeedMatchesPrompt
              hasMatches={(matches?.length ?? 0) > 0}
              onSeeded={() => mutate()}
            />
            <PlayoffFixBanner matches={matches ?? []} onFixed={() => mutate()} />
            <ResyncMatchesBanner
              matches={matches ?? []}
              onResynced={() => mutate()}
            />
            <AddMatchForm onAdded={() => mutate()} />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersManager
            users={users}
            loading={usersLoading}
            onChanged={() => mutateUsers()}
          />
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
              Niciun meci încărcat. Adaugă sau generează meciurile din tab-ul
              &quot;Adaugă meci&quot;.
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

function PlayoffFixBanner({
  matches,
  onFixed,
}: {
  matches: Match[]
  onFixed: () => void
}) {
  const [fixing, setFixing] = useState(false)
  const hasPlaceholders = matches.some(
    (m) => m.homeTeam.startsWith('Baraj ') || m.awayTeam.startsWith('Baraj '),
  )
  if (!hasPlaceholders) return null

  async function handleFix() {
    setFixing(true)
    try {
      const n = await fixPlayoffTeamNames()
      toast.success(`${n} meciuri actualizate cu echipele calificate din baraje.`)
      onFixed()
    } catch {
      toast.error('Eroare la actualizarea echipelor.')
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Unele meciuri au încă echipe-placeholder („Baraj UEFA/FIFA"). Apasă pentru
        a le înlocui cu echipele reale calificate (Bosnia, Suedia, Turcia, Cehia,
        RD Congo, Irak). Scorurile și pronosticurile nu sunt afectate.
      </p>
      <Button onClick={handleFix} disabled={fixing} className="shrink-0">
        {fixing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        Actualizează echipele
      </Button>
    </div>
  )
}

// Banner care detectează meciuri salvate cu ordinea greșită a echipelor în
// grupă (ex. Portugalia–Uzbekistan în loc de Portugalia–RD Congo) și le
// re-sincronizează cu programul oficial, mapând după ora de start. Numai
// numele echipelor sunt actualizate; scorurile și pronosticurile rămân legate
// de același slot orar.
function ResyncMatchesBanner({
  matches,
  onResynced,
}: {
  matches: Match[]
  onResynced: () => void
}) {
  const [syncing, setSyncing] = useState(false)

  // Construim un index al programului corect după ora de start.
  const correctByKickoff = new Map(
    WC2026_GROUP_MATCHES.map((m) => [m.kickoff, m]),
  )
  // Există vreun meci în baza de date care nu corespunde programului corect?
  const mismatches = matches.filter((m) => {
    const correct = correctByKickoff.get(m.kickoff)
    if (!correct) return false
    return m.homeTeam !== correct.homeTeam || m.awayTeam !== correct.awayTeam
  })
  if (mismatches.length === 0) return null

  async function handleResync() {
    setSyncing(true)
    try {
      const n = await resyncMatchTeams()
      toast.success(
        `${n} meciuri re-sincronizate cu programul oficial (ordinea corectată).`,
      )
      onResynced()
    } catch {
      toast.error('Eroare la re-sincronizarea meciurilor.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        {mismatches.length} meciuri au echipele în ordinea greșită față de
        programul oficial (ex. „Portugalia – Uzbekistan" în loc de „Portugalia –
        RD Congo"). Apasă pentru a le corecta. Scorurile și pronosticurile
        atașate fiecărui interval orar nu sunt șterse.
      </p>
      <Button
        onClick={handleResync}
        disabled={syncing}
        variant="destructive"
        className="shrink-0"
      >
        {syncing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <RefreshCw className="size-4" />
        )}
        Corectează meciurile
      </Button>
    </div>
  )
}

function SeedMatchesPrompt({
  hasMatches,
  onSeeded,
}: {
  hasMatches: boolean
  onSeeded: () => void
}) {
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    setSeeding(true)
    try {
      const count = await seedGroupMatchesIfEmpty()
      if (count > 0) {
        toast.success(`${count} meciuri din faza grupelor au fost adăugate!`)
        onSeeded()
      } else {
        toast.info('Există deja meciuri. Nu am suprascris nimic.')
      }
    } catch {
      toast.error('Eroare la generarea meciurilor.')
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Generează faza grupelor</p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Adaugă automat toate cele 72 de meciuri din faza grupelor CM 2026
            (Etapele 1-3). Meciurile din fazele eliminatorii se adaugă manual,
            după stabilirea echipelor calificate.
          </p>
        </div>
      </div>
      <Button
        onClick={handleSeed}
        disabled={seeding || hasMatches}
        className="shrink-0"
      >
        {seeding ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {hasMatches ? 'Meciuri deja generate' : 'Generează meciurile'}
      </Button>
    </div>
  )
}

function AddMatchForm({ onAdded }: { onAdded: () => void }) {
  const [home, setHome] = useState('')
  const [away, setAway] = useState('')
  const [stage, setStage] = useState<StageId>(1)
  const [round, setRound] = useState<KnockoutRound>('r16')
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
        ...(stage === 5 ? { round } : {}),
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

          {stage === 5 && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="round">Runda eliminatorie (decide termenul limită)</Label>
              <select
                id="round"
                value={round}
                onChange={(e) => setRound(e.target.value as KnockoutRound)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {KNOCKOUT_ROUNDS.map((r) => (
                  <option key={r.round} value={r.round}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          )}

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

  async function handleDelete() {
    if (
      !window.confirm(
        `Ștergi meciul ${match.homeTeam} - ${match.awayTeam}?`,
      )
    )
      return
    setSaving(true)
    try {
      await deleteMatch(match.id)
      toast.success('Meci șters.')
      onSaved()
    } catch {
      toast.error('Eroare la ștergere.')
    } finally {
      setSaving(false)
    }
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
              <Lock className="size-3" /> Blocat
            </Badge>
          ) : (
            <Badge className="bg-primary/15 text-primary">Deschis</Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Șterge meci"
            className="ml-auto size-7 text-destructive hover:text-destructive"
            disabled={saving}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
          </Button>
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

function UsersManager({
  users,
  loading,
  onChanged,
}: {
  users: AppUser[] | undefined
  loading: boolean
  onChanged: () => void
}) {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !username.trim() || !password.trim()) {
      toast.error('Completează nume, utilizator și parolă.')
      return
    }
    const exists = (users ?? []).some(
      (u) => u.username === username.trim().toLowerCase(),
    )
    if (exists) {
      toast.error('Acest utilizator există deja.')
      return
    }
    setSaving(true)
    try {
      await createUser(name, username, password, false)
      toast.success('Participant adăugat!')
      setName('')
      setUsername('')
      setPassword('')
      onChanged()
    } catch {
      toast.error('Eroare la adăugare.')
    } finally {
      setSaving(false)
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      const created = await seedUsersIfEmpty()
      if (created) {
        toast.success('Lista de participanți a fost creată (parolă: cm2026).')
        onChanged()
      } else {
        toast.info('Există deja conturi. Lista nu a fost suprascrisă.')
      }
    } catch {
      toast.error('Eroare la inițializare.')
    } finally {
      setSeeding(false)
    }
  }

  const participants = (users ?? []).filter((u) => !u.isAdmin)

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adaugă participant</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex flex-col gap-2">
                <Label htmlFor="u-name">Nume complet</Label>
                <Input
                  id="u-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Simon Tiberiu"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="u-username">Utilizator</Label>
                <Input
                  id="u-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: simon.tiberiu"
                  autoCapitalize="none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="u-password">Parolă</Label>
                <Input
                  id="u-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="ex: cm2026"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving} className="self-start">
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserPlus className="size-4" />
                )}
                Adaugă participant
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={seeding}
                onClick={handleSeed}
              >
                {seeding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Users className="size-4" />
                )}
                Inițializează lista J4F
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : participants.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Niciun participant. Adaugă manual sau folosește &quot;Inițializează
          lista J4F&quot;.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {participants
            .slice()
            .sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username))
            .map((u) => (
              <UserRow key={u.id} user={u} onChanged={onChanged} />
            ))}
        </div>
      )}
    </div>
  )
}

function UserRow({ user, onChanged }: { user: AppUser; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)

  async function handleReset() {
    const pwd = window.prompt(
      `Parolă nouă pentru ${user.name || user.username}:`,
      'cm2026',
    )
    if (!pwd) return
    setBusy(true)
    try {
      await updateUserPassword(user.id, pwd)
      toast.success('Parolă resetată. Utilizatorul o va schimba la următoarea logare.')
      onChanged()
    } catch {
      toast.error('Eroare la actualizare.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Ștergi participantul ${user.name || user.username}?`)) return
    setBusy(true)
    try {
      await deleteUser(user.id)
      toast.success('Participant șters.')
      onChanged()
    } catch {
      toast.error('Eroare la ștergere.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{user.name || user.username}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Resetează parola"
            disabled={busy}
            onClick={handleReset}
          >
            <KeyRound className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Șterge participant"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
