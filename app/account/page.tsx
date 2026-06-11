'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { changeOwnPassword } from '@/lib/data'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

export default function AccountPage() {
  return (
    <AppShell>
      <AccountContent />
    </AppShell>
  )
}

function AccountContent() {
  const { user, refreshSession } = useAuth()
  const router = useRouter()
  const forced = user?.mustChangePassword === true

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (next !== confirm) {
      toast.error('Parolele noi nu coincid.')
      return
    }
    setSaving(true)
    try {
      const res = await changeOwnPassword(user.id, current, next)
      if (!res.ok) {
        toast.error(res.error ?? 'Eroare la schimbarea parolei.')
        return
      }
      await refreshSession()
      toast.success('Parola a fost schimbată cu succes!')
      setCurrent('')
      setNext('')
      setConfirm('')
      if (forced) router.replace('/dashboard')
    } catch {
      toast.error('Eroare de conexiune.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <div>
        <h1 className="font-heading text-3xl font-bold">Contul meu</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestionează-ți parola contului.
        </p>
      </div>

      {forced && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold text-foreground">
              Schimbă-ți parola pentru a continua
            </p>
            <p className="text-sm text-muted-foreground">
              Folosești o parolă implicită. Din motive de securitate, te rugăm
              să-ți alegi o parolă nouă înainte de a folosi aplicația.
            </p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <KeyRound className="size-5 text-primary" />
          <CardTitle className="text-base">Schimbă parola</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="current">Parola curentă</Label>
              <Input
                id="current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="next">Parola nouă</Label>
              <Input
                id="next"
                type="password"
                value={next}
                onChange={(e) => setNext(e.target.value)}
                autoComplete="new-password"
                placeholder="minim 4 caractere"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm">Confirmă parola nouă</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" disabled={saving} className="mt-1">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Salvează parola nouă
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
