'use client'

import Link from 'next/link'
import { useState, useMemo, useEffect } from 'react'
import { AppShell } from '@/components/app-shell'
import { TeamName } from '@/components/team-name'
import { useEdition } from '@/components/edition-provider'
import { useAuth } from '@/components/auth-provider'
import { useMatches, useUsers, useAllPredictions } from '@/lib/hooks'
import {
  createMatch,
  deleteMatch,
  updateMatchResult,
  adminSetPrediction,
  createUser,
  deleteUser,
  updateUserPassword,
  updateUserAccess,
  setUserEditionAccess,
  seedUsersIfEmpty,
  seedGroupMatchesIfEmpty,
  fixPlayoffTeamNames,
  resyncMatchTeams,
  computeStandings,
} from '@/lib/data'
import {
  importEditionMatches,
  importWorldCupKnockout,
  importChampionsLeague,
} from '@/app/actions/sync'
import { EDITIONS, COMPETITIONS, formatSeasonYear } from '@/lib/editions'
import { DEFAULT_EDITION_ID, hasEditionAccess } from '@/lib/types'
import { WC2026_GROUP_MATCHES } from '@/lib/wc2026-schedule'
import {
  STAGES,
  isLocked,
  isUserAdmin,
  isViewOnly,
  getActiveStage,
  KNOCKOUT_ROUNDS,
  type Match,
  type StageId,
  type KnockoutRound,
  type AppUser,
  type Prediction,
} from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { SyncPanel } from '@/components/sync-panel'
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
  CheckCircle2,
  CircleDashed,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  Trophy,
  Cpu,
  PencilLine,
  ShieldCheck,
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
  const { editionId, edition } = useEdition()
  const { data: matches, isLoading, mutate } = useMatches()
  const { data: users, isLoading: usersLoading, mutate: mutateUsers } = useUsers()
  const { data: predictions } = useAllPredictions()
  const [exporting, setExporting] = useState(false)
  const [activeTab, setActiveTab] = useState('results')

  const ADMIN_TABS = [
    { value: 'results', label: 'Rezultate' },
    { value: 'sync', label: 'Sincronizare' },
    { value: 'completion', label: 'Completare' },
    { value: 'predictions', label: 'Pronosticuri' },
    { value: 'add', label: 'Adaugă meci' },
    { value: 'users', label: 'Participanți' },
  ] as const

  async function handleExport() {
    if (!users || !matches || !predictions) {
      toast.error('Datele nu sunt încă încărcate.')
      return
    }
    setExporting(true)
    try {
      const standings = computeStandings(
        users,
        matches,
        predictions,
        undefined,
        { isAdmin: true },
      )
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
          <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            Editezi:{' '}
            <span className="font-bold text-foreground">{edition.label}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/notification-engine"
            className={buttonVariants({ variant: 'outline' })}
          >
            <Cpu className="size-4" />
            Notification Engine
          </Link>
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
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-secondary/70 sm:w-64">
            <span>
              {ADMIN_TABS.find((t) => t.value === activeTab)?.label}
            </span>
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] min-w-56">
            {ADMIN_TABS.map((t) => (
              <DropdownMenuItem
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className="gap-2"
              >
                <span className="flex-1">{t.label}</span>
                {t.value === activeTab && (
                  <Check className="size-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <TabsContent value="add" className="mt-4">
          <div className="flex flex-col gap-4">
            {editionId === DEFAULT_EDITION_ID ? (
              <>
                <SeedMatchesPrompt
                  hasMatches={(matches?.length ?? 0) > 0}
                  onSeeded={() => mutate()}
                />
                <PlayoffFixBanner
                  matches={matches ?? []}
                  onFixed={() => mutate()}
                />
                <ResyncMatchesBanner
                  matches={matches ?? []}
                  onResynced={() => mutate()}
                />
                <ImportKnockoutBanner onImported={() => mutate()} />
              </>
            ) : edition.competitionId === 'cl' ? (
              <ImportChampionsLeagueBanner
                editionId={editionId}
                editionLabel={edition.label}
                onImported={() => mutate()}
              />
            ) : (
              <ImportEditionMatchesBanner
                editionId={editionId}
                editionLabel={edition.label}
                hasMatches={(matches?.length ?? 0) > 0}
                onImported={() => mutate()}
              />
            )}
            <AddMatchForm editionId={editionId} onAdded={() => mutate()} />
          </div>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UsersManager
            users={users}
            loading={usersLoading}
            onChanged={() => mutateUsers()}
          />
        </TabsContent>

        <TabsContent value="completion" className="mt-4">
          <CompletionOverview
            users={users}
            matches={matches}
            predictions={predictions}
            loading={isLoading || usersLoading}
          />
        </TabsContent>

        <TabsContent value="predictions" className="mt-4">
          <PredictionEditor
            users={users}
            matches={matches}
            predictions={predictions}
            loading={isLoading || usersLoading}
            onSaved={() => mutate()}
          />
        </TabsContent>

        <TabsContent value="sync" className="mt-4">
          <SyncPanel />
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

// Vedere de ansamblu pentru admin: cât a completat fiecare participant din
// fiecare etapă cu meciuri. Arată un tabel cu numărul de pronosticuri pe etapă
// și o stare generală, ca să se vadă cine a rămas în urmă.
function CompletionOverview({
  users,
  matches,
  predictions,
  loading,
}: {
  users: AppUser[] | undefined
  matches: Match[] | undefined
  predictions: Prediction[] | undefined
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  const participants = (users ?? []).filter(
    (u) => !isUserAdmin(u) && !isViewOnly(u),
  )
  const allMatches = matches ?? []
  const allPreds = predictions ?? []

  // Etapele care au cel puțin un meci încărcat (ignorăm etapele goale).
  const stagesWithMatches = STAGES.filter((s) =>
    allMatches.some((m) => m.stage === s.id),
  )

  // Câte meciuri are fiecare etapă.
  const matchesPerStage = new Map<StageId, number>()
  for (const s of stagesWithMatches) {
    matchesPerStage.set(
      s.id as StageId,
      allMatches.filter((m) => m.stage === s.id).length,
    )
  }
  const totalMatches = allMatches.length

  // matchId -> stage, pentru a clasifica rapid fiecare pronostic.
  const matchStage = new Map<string, StageId>()
  for (const m of allMatches) matchStage.set(m.id, m.stage)

  // userId -> stageId -> număr de pronosticuri completate.
  const byUser = new Map<string, Map<StageId, number>>()
  for (const p of allPreds) {
    const stage = matchStage.get(p.matchId)
    if (stage === undefined) continue
    if (!byUser.has(p.userId)) byUser.set(p.userId, new Map())
    const m = byUser.get(p.userId)!
    m.set(stage, (m.get(stage) ?? 0) + 1)
  }

  const activeStage = getActiveStage()

  if (participants.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Niciun participant înregistrat.
      </p>
    )
  }
  if (totalMatches === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Niciun meci încărcat încă, deci nu există pronosticuri de urmărit.
      </p>
    )
  }

  // Sortăm participanții descrescător după totalul de pronosticuri completate.
  const rows = participants
    .map((u) => {
      const perStage = byUser.get(u.id) ?? new Map<StageId, number>()
      const total = [...perStage.values()].reduce((a, b) => a + b, 0)
      return { user: u, perStage, total }
    })
    .sort((a, b) => b.total - a.total || a.user.name.localeCompare(b.user.name))

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-secondary/40 p-4">
        <Users className="size-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {participants.length} participanți · {totalMatches} meciuri în total.
          Coloana evidențiată este etapa activă acum.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/60 text-left">
              <th className="px-3 py-2.5 font-heading font-bold">Participant</th>
              {stagesWithMatches.map((s) => (
                <th
                  key={s.id}
                  className={`px-3 py-2.5 text-center font-heading font-bold ${
                    s.id === activeStage ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  {s.short}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center font-heading font-bold">
                Total
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ user, perStage, total }) => {
              const complete = total >= totalMatches
              return (
                <tr
                  key={user.id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {complete ? (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      ) : (
                        <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  {stagesWithMatches.map((s) => {
                    const done = perStage.get(s.id as StageId) ?? 0
                    const need = matchesPerStage.get(s.id as StageId) ?? 0
                    const full = need > 0 && done >= need
                    return (
                      <td
                        key={s.id}
                        className={`px-3 py-2.5 text-center tabular-nums ${
                          s.id === activeStage ? 'bg-primary/5' : ''
                        }`}
                      >
                        <span
                          className={
                            full
                              ? 'font-semibold text-primary'
                              : done === 0
                                ? 'text-muted-foreground'
                                : 'font-medium text-foreground'
                          }
                        >
                          {done}/{need}
                        </span>
                      </td>
                    )
                  })}
                  <td className="px-3 py-2.5 text-center">
                    <Badge variant={complete ? 'default' : 'secondary'}>
                      {total}/{totalMatches}
                    </Badge>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Editor de pronosticuri pentru administrator: permite introducerea sau
// corectarea scorului pronosticat de un participant, DOAR la meciuri care încă
// nu au început. Fiecare salvare marchează pronosticul ca „modificat de admin”,
// afișat transparent tuturor. Refolosește datele deja încărcate (matches,
// users, predictions), deci nu face citiri suplimentare din Firestore.
function PredictionEditor({
  users,
  matches,
  predictions,
  loading,
  onSaved,
}: {
  users: AppUser[] | undefined
  matches: Match[] | undefined
  predictions: Prediction[] | undefined
  loading: boolean
  onSaved: () => void
}) {
  const { user: admin } = useAuth()
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [drafts, setDrafts] = useState<
    Record<string, { home: string; away: string }>
  >({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const upcoming = useMemo(
    () =>
      [...(matches ?? [])]
        .filter((m) => new Date(m.kickoff).getTime() > Date.now())
        .sort((a, b) => +new Date(a.kickoff) - +new Date(b.kickoff)),
    [matches],
  )

  const participants = useMemo(
    () =>
      (users ?? [])
        .filter((u) => !isUserAdmin(u) && !isViewOnly(u))
        .sort((a, b) => a.name.localeCompare(b.name, 'ro')),
    [users],
  )

  const selectedMatch = upcoming.find((m) => m.id === selectedMatchId) ?? null
  const matchPreds = (predictions ?? []).filter(
    (p) => p.matchId === selectedMatchId,
  )

  // La schimbarea meciului, precompletează câmpurile cu pronosticurile curente.
  useEffect(() => {
    if (!selectedMatchId) {
      setDrafts({})
      return
    }
    const next: Record<string, { home: string; away: string }> = {}
    for (const u of participants) {
      const p = (predictions ?? []).find(
        (x) => x.matchId === selectedMatchId && x.userId === u.id,
      )
      next[u.id] = {
        home: p ? String(p.homeScore) : '',
        away: p ? String(p.awayScore) : '',
      }
    }
    setDrafts(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId])

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  async function handleSave(userId: string, userName: string) {
    const draft = drafts[userId]
    if (!draft || !selectedMatch) return
    const home = Number(draft.home)
    const away = Number(draft.away)
    if (
      draft.home === '' ||
      draft.away === '' ||
      !Number.isInteger(home) ||
      !Number.isInteger(away) ||
      home < 0 ||
      away < 0
    ) {
      toast.error('Introdu un scor valid (numere întregi ≥ 0).')
      return
    }
    setSavingId(userId)
    try {
      await adminSetPrediction(
        userId,
        selectedMatch.id,
        home,
        away,
        admin?.name || admin?.username || 'Administrator',
      )
      toast.success(`Pronostic salvat pentru ${userName}: ${home}-${away}.`)
      onSaved()
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Eroare la salvarea pronosticului.',
      )
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-3 rounded-lg border border-border bg-secondary/40 p-4">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Poți introduce sau corecta pronosticul unui participant doar la
          meciuri care <span className="font-semibold">nu au început</span>.
          Fiecare modificare este marcată vizibil ca{' '}
          <span className="font-semibold text-foreground">
            „modificat de admin”
          </span>{' '}
          pentru toți colegii.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="pred-match">Meci (doar cele neîncepute)</Label>
        {upcoming.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            Niciun meci neînceput în această competiție.
          </p>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              id="pred-match"
              className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary/70"
            >
              <span className="truncate">
                {selectedMatch
                  ? `${selectedMatch.homeTeam} - ${selectedMatch.awayTeam} · ${formatKickoff(selectedMatch.kickoff)}`
                  : 'Alege un meci…'}
              </span>
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-80 w-[--radix-dropdown-menu-trigger-width] min-w-72 overflow-y-auto"
            >
              {upcoming.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  onClick={() => setSelectedMatchId(m.id)}
                  className="flex flex-col items-start gap-0.5"
                >
                  <span className="font-medium">
                    {m.homeTeam} - {m.awayTeam}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatKickoff(m.kickoff)}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {selectedMatch && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-medium text-muted-foreground">
              {participants.length} participanți ·{' '}
              {matchPreds.length} cu pronostic
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {participants.map((u) => {
              const pred = matchPreds.find((p) => p.userId === u.id) ?? null
              const draft = drafts[u.id] ?? { home: '', away: '' }
              const isSaving = savingId === u.id
              return (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border px-3 py-2.5"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {pred ? (
                      <CheckCircle2 className="size-4 shrink-0 text-primary" />
                    ) : (
                      <CircleDashed className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate text-sm font-medium">
                      {u.name}
                    </span>
                    {pred?.editedByAdmin && (
                      <Badge
                        variant="secondary"
                        className="gap-1 px-1.5 py-0 text-[10px] font-bold"
                      >
                        <PencilLine className="size-3" />
                        Admin
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`Scor gazde pentru ${u.name}`}
                      value={draft.home}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [u.id]: { ...draft, home: e.target.value },
                        }))
                      }
                      className="w-14 text-center"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`Scor oaspeți pentru ${u.name}`}
                      value={draft.away}
                      onChange={(e) =>
                        setDrafts((d) => ({
                          ...d,
                          [u.id]: { ...draft, away: e.target.value },
                        }))
                      }
                      className="w-14 text-center"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleSave(u.id, u.name)}
                      disabled={isSaving}
                      className="shrink-0"
                    >
                      {isSaving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Save className="size-4" />
                      )}
                      Salvează
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
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

// Banner care detectează meciuri salvate cu data/ora, etapa sau ordinea
// echipelor greșite față de programul oficial și le re-sincronizează. Mapează
// după perechea de echipe (unică în grupe), așa că poate corecta inclusiv ziua
// și ora. Scorurile și pronosticurile rămân atașate aceluiași meci.
function ResyncMatchesBanner({
  matches,
  onResynced,
}: {
  matches: Match[]
  onResynced: () => void
}) {
  const [syncing, setSyncing] = useState(false)

  // Cheie neordonată pentru o pereche de echipe (ignoră ordinea și diacriticele).
  const pairKey = (a: string, b: string) => {
    const norm = (s: string) =>
      s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
    return [norm(a), norm(b)].sort().join('::')
  }

  // Index al programului corect după perechea de echipe.
  const correctByPair = new Map<string, (typeof WC2026_GROUP_MATCHES)[number]>()
  for (const m of WC2026_GROUP_MATCHES) {
    correctByPair.set(pairKey(m.homeTeam, m.awayTeam), m)
  }

  // Există vreun meci a cărui dată/oră, etapă sau ordine diferă de program?
  const mismatches = matches.filter((m) => {
    const correct = correctByPair.get(pairKey(m.homeTeam, m.awayTeam))
    if (!correct) return false
    return (
      m.kickoff !== correct.kickoff ||
      m.stage !== correct.stage ||
      m.homeTeam !== correct.homeTeam ||
      m.awayTeam !== correct.awayTeam
    )
  })
  if (mismatches.length === 0) return null

  async function handleResync() {
    setSyncing(true)
    try {
      const n = await resyncMatchTeams()
      toast.success(
        `${n} meciuri re-sincronizate cu programul oficial (dată, oră și ordine corectate).`,
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
        {mismatches.length} meciuri au data/ora sau ordinea echipelor diferită
        față de programul oficial. Apasă pentru a le corecta automat. Scorurile
        și pronosticurile atașate fiecărui meci nu sunt șterse.
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

// Banner pentru încărcarea meciurilor unei ediții (alta decât CM 2026) de la
// football-data.org. Edițiile viitoare pot fi goale până când furnizorul are
// programul; atunci importul întoarce un mesaj prietenos.
function ImportEditionMatchesBanner({
  editionId,
  editionLabel,
  hasMatches,
  onImported,
}: {
  editionId: string
  editionLabel: string
  hasMatches: boolean
  onImported: () => void
}) {
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    setImporting(true)
    try {
      const res = await importEditionMatches(editionId)
      if (res.ok) {
        toast.success(res.message)
        onImported()
      } else {
        toast.info(res.message)
      }
    } catch {
      toast.error('Eroare la importul meciurilor.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Download className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Încarcă meciurile · {editionLabel}</p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Preia automat programul acestei ediții de la football-data.org. Dacă
            furnizorul nu are încă meciurile, încearcă din nou mai târziu.
            Meciurile deja încărcate nu sunt suprascrise.
          </p>
        </div>
      </div>
      <Button
        onClick={handleImport}
        disabled={importing || hasMatches}
        className="shrink-0"
      >
        {importing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {hasMatches ? 'Meciuri deja încărcate' : 'Încarcă meciuri'}
      </Button>
    </div>
  )
}

// Buton de import pentru întreaga fază eliminatorie a CM 2026: șaisprezecimi
// (Etapa 4) + optimi/sferturi/semifinale/finală (Etapa 5). Preia perechile de
// echipe din football-data.org și le creează în Firestore. Poate fi reapăsat
// oricând: adaugă doar meciurile noi (cu echipe stabilite), fără duplicate.
// Scorurile se sincronizează apoi automat.
function ImportKnockoutBanner({ onImported }: { onImported: () => void }) {
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    setImporting(true)
    try {
      const res = await importWorldCupKnockout()
      if (!res.ok) {
        toast.info(res.message)
      } else if (res.imported > 0) {
        toast.success(res.message)
        onImported()
      } else {
        toast.info(res.message)
      }
    } catch {
      toast.error('Eroare la importul fazei eliminatorii.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Trophy className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Încarcă faza eliminatorie</p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Preia de la football-data.org toate meciurile din faza eliminatorie:
            șaisprezecimi (Etapa 4) plus optimi, sferturi, semifinale și finală
            (Etapa 5). Apasă din nou după fiecare tragere la sorți pentru
            meciurile noi — cele deja încărcate nu se dublează, iar scorurile se
            sincronizează automat.
          </p>
        </div>
      </div>
      <Button onClick={handleImport} disabled={importing} className="shrink-0">
        {importing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {importing ? 'Se importă...' : 'Încarcă faza eliminatorie'}
      </Button>
    </div>
  )
}

// Buton de import pentru Champions League: preia din football-data.org toate
// meciurile competiției (faza-ligă Etapele 1-8, play-off Etapa 9, optimi Etapa
// 10, sferturi/semifinale/finală Etapa 11) și le creează pentru ediția curentă.
// Idempotent: reapasă oricând după tragerile la sorți — meciurile existente nu
// se dublează, iar scorurile (90') se sincronizează automat.
function ImportChampionsLeagueBanner({
  editionId,
  editionLabel,
  onImported,
}: {
  editionId: string
  editionLabel: string
  onImported: () => void
}) {
  const [importing, setImporting] = useState(false)

  async function handleImport() {
    setImporting(true)
    try {
      const res = await importChampionsLeague(editionId)
      if (!res.ok) {
        toast.info(res.message)
      } else if (res.imported > 0) {
        toast.success(res.message)
        onImported()
      } else {
        toast.info(res.message)
      }
    } catch {
      toast.error('Eroare la importul Champions League.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Trophy className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        <div>
          <p className="font-medium">Încarcă meciurile ({editionLabel})</p>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Preia de la football-data.org meciurile din Champions League: faza-ligă
            (Etapele 1-8), play-off (Etapa 9), optimi (Etapa 10) și
            sferturi/semifinale/finală (Etapa 11). Apasă din nou după fiecare
            tragere la sorți — meciurile existente nu se dublează, iar scorurile
            se sincronizează automat.
          </p>
        </div>
      </div>
      <Button onClick={handleImport} disabled={importing} className="shrink-0">
        {importing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        {importing ? 'Se importă...' : 'Încarcă meciurile'}
      </Button>
    </div>
  )
}

function AddMatchForm({
  editionId,
  onAdded,
}: {
  editionId: string
  onAdded: () => void
}) {
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
        editionId,
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
          {match.scoreOverride && (
            <Badge
              variant="outline"
              className="gap-1 border-accent/50 text-accent"
              title="Scor introdus manual. Sincronizarea automată nu îl suprascrie."
            >
              Manual
            </Badge>
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
          <TeamName
            team={match.homeTeam}
            align="right"
            className="flex-1 justify-end font-semibold"
          />
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
          <TeamName team={match.awayTeam} className="flex-1 font-semibold" />
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
  const { edition } = useEdition()
  const { user: currentUser } = useAuth()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [seeding, setSeeding] = useState(false)

  // Accesul se gestionează DOAR pentru ediția selectată acum (competiția + anul
  // din selectorul din header), ca lista să reflecte liga și anul curent.
  const accessEditions = edition ? [edition] : []

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

  // Afișăm TOȚI utilizatorii, inclusiv adminii (care joacă și ei), ca să-și
  // poată gestiona accesul la competiții și vizibilitatea. Adminii sunt marcați
  // cu o etichetă, iar contul propriu nu poate fi șters (protecție).
  const participants = users ?? []

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
              <UserRow
                key={u.id}
                user={u}
                editions={accessEditions}
                onChanged={onChanged}
                isSelf={u.id === currentUser?.id}
              />
            ))}
        </div>
      )}
    </div>
  )
}

function UserRow({
  user,
  editions,
  onChanged,
  isSelf = false,
}: {
  user: AppUser
  editions: typeof EDITIONS
  onChanged: () => void
  isSelf?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [savingAccess, setSavingAccess] = useState(false)
  // Stare optimistă pentru comutatoare, ca UI-ul să răspundă imediat.
  const [viewOnly, setViewOnly] = useState(user.viewOnly === true)
  const [hidden, setHidden] = useState(user.hideFromStandings === true)

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

  // Salvează un comutator de acces; revine la valoarea veche dacă eșuează.
  async function saveAccess(
    patch: { viewOnly?: boolean; hideFromStandings?: boolean },
    revert: () => void,
  ) {
    setSavingAccess(true)
    try {
      await updateUserAccess(user.id, patch)
      toast.success('Acces actualizat.')
      onChanged()
    } catch {
      toast.error('Eroare la actualizarea accesului.')
      revert()
    } finally {
      setSavingAccess(false)
    }
  }

  function toggleViewOnly(next: boolean) {
    const prev = viewOnly
    setViewOnly(next)
    // Un cont de supraveghere e implicit ascuns oricum; nu forțăm hidden, dar
    // clasamentele îl exclud automat prin isViewOnly.
    void saveAccess({ viewOnly: next }, () => setViewOnly(prev))
  }

  function toggleHidden(next: boolean) {
    const prev = hidden
    setHidden(next)
    void saveAccess({ hideFromStandings: next }, () => setHidden(prev))
  }

  // Acces per ediție: setează access[editionId] pe utilizator. Optimist.
  const [editionBusy, setEditionBusy] = useState<string | null>(null)
  async function toggleEdition(editionId: string, next: boolean) {
    setEditionBusy(editionId)
    try {
      await setUserEditionAccess(user.id, editionId, next)
      onChanged()
    } catch {
      toast.error('Eroare la actualizarea accesului la competiție.')
    } finally {
      setEditionBusy(null)
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-medium">
                {user.name || user.username}
              </p>
              {user.isAdmin && (
                <Badge variant="secondary" className="shrink-0">
                  Admin
                </Badge>
              )}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              @{user.username}
            </p>
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
            {!isSelf && (
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
            )}
          </div>
        </div>

        {/* Drepturi de acces controlate de admin */}
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3">
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              <Eye className="size-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Doar supraveghere</span>
                <span className="block text-xs text-muted-foreground">
                  Nu poate pronostica și nu apare nicăieri.
                </span>
              </span>
            </span>
            <Switch
              checked={viewOnly}
              disabled={savingAccess}
              onCheckedChange={toggleViewOnly}
              aria-label="Doar supraveghere"
            />
          </label>
          <label className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-sm">
              <EyeOff className="size-4 text-muted-foreground" />
              <span>
                <span className="font-medium">Ascuns din clasamente</span>
                <span className="block text-xs text-muted-foreground">
                  Joacă normal și apare la „Colegii", dar nu în clasamente
                  (se vede doar pe sine).
                </span>
              </span>
            </span>
            <Switch
              checked={hidden}
              disabled={savingAccess || viewOnly}
              onCheckedChange={toggleHidden}
              aria-label="Ascuns din clasamente"
            />
          </label>
        </div>

        {/* Acces per competiție/ediție: la edițiile noi nimeni nu are acces
            până când adminul nu bifează aici. */}
        {editions.length > 0 && (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-secondary/30 p-3">
            <p className="text-sm font-medium">Acces la competiții</p>
            <div className="flex flex-col gap-2">
              {editions.map((e) => {
                const allowed = hasEditionAccess(user, e.id)
                const comp = COMPETITIONS[e.competitionId]
                return (
                  <label
                    key={e.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-sm">
                      <span className="font-medium">{comp.short}</span>{' '}
                      <span className="text-muted-foreground">
                        {formatSeasonYear(e.competitionId, e.year)}
                      </span>
                    </span>
                    <Switch
                      checked={allowed}
                      disabled={editionBusy === e.id || viewOnly}
                      onCheckedChange={(next) => toggleEdition(e.id, next)}
                      aria-label={`Acces ${e.label}`}
                    />
                  </label>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
