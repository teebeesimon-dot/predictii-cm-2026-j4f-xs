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
  const { user, loading, login } = useAuth()
  const router = useRouter()
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
      const res = await login(username, password)
      if (res.ok) {
        toast.success('Bine ai revenit!')
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
            Predictii Just4Fun
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-accent">
            Just4Fun League
          </p>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            Pune pronosticuri la marile competiții de fotbal, urcă în clasament
            și cucerește trofeul.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-xl backdrop-blur-sm">
          {/* Romanian flag accent strip */}
          <div className="flex h-1.5 w-full">
            <div className="flex-1 bg-[#002B7F]" />
            <div className="flex-1 bg-[#FCD116]" />
            <div className="flex-1 bg-[#CE1126]" />
          </div>
          <div className="p-6">
            <h2 className="mb-5 text-center font-heading text-lg font-bold uppercase tracking-wide">
              Autentificare
            </h2>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username">Utilizator</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ex: simon.tiberiu"
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
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button type="submit" className="mt-1 w-full" disabled={submitting}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Intră în cont
              </Button>
            </form>

            <p className="mt-4 text-center text-xs leading-relaxed text-muted-foreground">
              Conturile sunt create de administrator. Dacă nu ai date de acces,
              contactează-l.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
