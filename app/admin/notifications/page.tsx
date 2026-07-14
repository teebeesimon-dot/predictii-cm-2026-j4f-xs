'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useUsers } from '@/lib/hooks'
import { isUserAdmin } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import {
  Bell,
  Send,
  BadgeCheck,
  Users,
  User,
  ChevronDown,
  ArrowLeft,
  Loader2,
} from 'lucide-react'

interface SendOutcome {
  sent: number
  failed: number
  invalidTokensRemoved: number
}

export default function NotificationsPage() {
  return (
    <AppShell requireAdmin>
      <NotificationsContent />
    </AppShell>
  )
}

function NotificationsContent() {
  const { user } = useAuth()
  const { data: users } = useUsers()

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<'all' | 'one'>('all')
  const [targetUserId, setTargetUserId] = useState<string>('')
  const [sending, setSending] = useState(false)
  const [testing, setTesting] = useState(false)
  const [outcome, setOutcome] = useState<SendOutcome | null>(null)

  // Lista de destinatari posibili (exclude conturile de supraveghere).
  const recipients = useMemo(
    () => (users ?? []).slice().sort((a, b) => (a.name || a.username).localeCompare(b.name || b.username)),
    [users],
  )
  const selectedUser = recipients.find((u) => u.id === targetUserId)

  async function postJson(url: string, payload: Record<string, unknown>) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, actorId: user?.id }),
    })
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>
    if (!res.ok) {
      throw new Error((data.error as string) || 'Eroare la trimitere.')
    }
    return data as unknown as { success: boolean } & SendOutcome
  }

  async function handleSend() {
    if (!title.trim() || !body.trim()) {
      toast.error('Completează titlul și mesajul.')
      return
    }
    if (audience === 'one' && !targetUserId) {
      toast.error('Alege un utilizator.')
      return
    }
    if (audience === 'all') {
      const ok = window.confirm(
        'Sigur trimiți această notificare CĂTRE TOȚI utilizatorii?',
      )
      if (!ok) return
    }

    setSending(true)
    setOutcome(null)
    try {
      const data = await postJson('/api/admin/send-notification', {
        title: title.trim(),
        body: body.trim(),
        sendToAll: audience === 'all',
        userId: audience === 'one' ? targetUserId : undefined,
      })
      setOutcome(data)
      toast.success(
        `Trimise: ${data.sent} · Eșuate: ${data.failed}` +
          (data.invalidTokensRemoved
            ? ` · Token-uri curățate: ${data.invalidTokensRemoved}`
            : ''),
      )
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setOutcome(null)
    try {
      const data = await postJson('/api/admin/test-notification', {})
      setOutcome(data)
      if (data.sent > 0) {
        toast.success('Notificarea de test a fost trimisă către dispozitivele tale.')
      } else {
        toast.info(
          'Niciun dispozitiv înregistrat pentru contul tău. Deschide aplicația Android și acceptă notificările.',
        )
      }
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setTesting(false)
    }
  }

  const busy = sending || testing

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <Link
          href="/admin"
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Înapoi la Administrare
        </Link>
        <h1 className="flex items-center gap-2 font-heading text-3xl font-bold tracking-tight">
          <Bell className="size-7 text-primary" />
          Notificări Push
        </h1>
        <p className="mt-1 text-pretty text-muted-foreground">
          Trimite notificări către toți jucătorii sau către un anumit utilizator.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Compune notificarea</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="notif-title">Titlu</Label>
            <Input
              id="notif-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: A început o nouă etapă!"
              maxLength={80}
              disabled={busy}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="notif-body">Mesaj</Label>
            <textarea
              id="notif-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="ex: Nu uita să-ți pui pronosticurile înainte de deadline."
              maxLength={240}
              rows={4}
              disabled={busy}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Destinatar</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudience('all')}
                disabled={busy}
                className={
                  'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ' +
                  (audience === 'all'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-foreground hover:bg-secondary/70')
                }
              >
                <Users className="size-4" />
                Toți utilizatorii
              </button>
              <button
                type="button"
                onClick={() => setAudience('one')}
                disabled={busy}
                className={
                  'flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:opacity-50 ' +
                  (audience === 'one'
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-secondary text-foreground hover:bg-secondary/70')
                }
              >
                <User className="size-4" />
                Un utilizator
              </button>
            </div>
          </div>

          {audience === 'one' && (
            <div className="flex flex-col gap-2">
              <Label>Alege utilizatorul</Label>
              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={busy}
                  className="flex items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-colors hover:bg-secondary/50 disabled:opacity-50"
                >
                  <span
                    className={selectedUser ? '' : 'text-muted-foreground'}
                  >
                    {selectedUser
                      ? `${selectedUser.name || selectedUser.username} (@${selectedUser.username})`
                      : 'Selectează un utilizator'}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-72 w-[--radix-dropdown-menu-trigger-width] overflow-y-auto"
                >
                  {recipients.map((u) => (
                    <DropdownMenuItem
                      key={u.id}
                      onClick={() => setTargetUserId(u.id)}
                    >
                      <span className="flex-1 truncate">
                        {u.name || u.username}
                        {isUserAdmin(u) ? ' (admin)' : ''}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        @{u.username}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={handleSend} disabled={busy} className="flex-1">
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
              Trimite notificare
            </Button>
            <Button
              variant="secondary"
              onClick={handleTest}
              disabled={busy}
              className="flex-1"
            >
              {testing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <BadgeCheck className="size-4" />
              )}
              Trimite notificare de test
            </Button>
          </div>

          {outcome && (
            <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{outcome.sent}</p>
                <p className="text-xs text-muted-foreground">Trimise</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">
                  {outcome.failed}
                </p>
                <p className="text-xs text-muted-foreground">Erori</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {outcome.invalidTokensRemoved}
                </p>
                <p className="text-xs text-muted-foreground">Token-uri curățate</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
