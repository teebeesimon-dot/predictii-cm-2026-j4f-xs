'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trophy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginPage() {
  const { user, loading, login, register } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && user) router.replace('/dashboard')
  }, [user, loading, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const res =
        mode === 'login'
          ? await login(username, password)
          : await register(username, password)
      if (res.ok) {
        toast.success(mode === 'login' ? 'Bine ai revenit!' : 'Cont creat cu succes!')
        router.replace('/dashboard')
      } else {
        toast.error(res.error ?? 'A apărut o eroare.')
      }
    } catch {
      toast.error('Eroare de conexiune. Verifică setările Firebase.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Stadium background */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-15"
        style={{ backgroundImage: 'url(/stadium-night.png)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background"
        aria-hidden="true"
      />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Trophy className="size-8" />
          </div>
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">
            Predictii CM 2026
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-accent">
            J4F League
          </p>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            Pune pronosticuri la meciurile Campionatului Mondial, urcă în clasament
            și cucerește trofeul.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card/90 p-6 shadow-xl backdrop-blur-sm">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={
                'rounded-md py-2 text-sm font-semibold transition-colors ' +
                (mode === 'login'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              Autentificare
            </button>
            <button
              type="button"
              onClick={() => setMode('register')}
              className={
                'rounded-md py-2 text-sm font-semibold transition-colors ' +
                (mode === 'register'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground')
              }
            >
              Cont nou
            </button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="username">Utilizator</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ex: ionut"
                autoComplete="username"
                autoCapitalize="none"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Parolă</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
              />
            </div>
            <Button type="submit" className="mt-1 w-full" disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {mode === 'login' ? 'Intră în cont' : 'Creează cont'}
            </Button>
          </form>

          {mode === 'register' && (
            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              Primul cont creat devine automat administrator.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
