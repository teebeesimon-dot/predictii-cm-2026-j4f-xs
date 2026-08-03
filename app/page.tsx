'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { BrandLogo } from '@/components/brand-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail } from 'lucide-react'
import { GoogleGlyph } from '@/components/google-glyph'
import { toast } from 'sonner'

export default function LoginPage() {
  const {
    user,
    loading,
    needsAuthMigration,
    login,
    loginWithEmail,
    loginWithGoogle,
  } = useAuth()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState<'email' | 'google' | 'legacy' | null>(
    null,
  )

  useEffect(() => {
    if (!loading && user && !needsAuthMigration) {
      router.replace('/dashboard')
    }
  }, [user, loading, needsAuthMigration, router])

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting('email')
    try {
      const res = await loginWithEmail(email, emailPassword)
      if (res.ok) {
        toast.success('Bine ai revenit!')
        router.replace('/dashboard')
      } else {
        toast.error(res.error ?? 'A apărut o eroare.')
      }
    } catch {
      toast.error('Eroare de conexiune. Verifică setările Firebase.')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleGoogleLogin() {
    setSubmitting('google')
    try {
      const res = await loginWithGoogle()
      if (res.ok) {
        toast.success('Bine ai revenit!')
        router.replace('/dashboard')
      } else {
        toast.error(res.error ?? 'A apărut o eroare.')
      }
    } catch {
      toast.error('Eroare de conexiune. Verifică setările Firebase.')
    } finally {
      setSubmitting(null)
    }
  }

  async function handleLegacyLogin(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting('legacy')
    try {
      const res = await login(username, password)
      if (res.ok && res.needsMigration) {
        toast.message('Actualizează-ți contul pentru a continua.')
        return
      }
      if (res.ok) {
        toast.success('Bine ai revenit!')
        router.replace('/dashboard')
      } else {
        toast.error(res.error ?? 'A apărut o eroare.')
      }
    } catch {
      toast.error('Eroare de conexiune. Verifică setările Firebase.')
    } finally {
      setSubmitting(null)
    }
  }

  const busy = submitting !== null

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-4 py-10">
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
          <BrandLogo size="hero" />
          <h1 className="font-heading text-3xl font-bold uppercase tracking-wide text-foreground">
            SKUPA
          </h1>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.3em] text-accent">
            Competiția ne adună.
          </p>
          <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
            Pune pronosticuri la marile competiții de fotbal, urcă în clasament
            și cucerește trofeul.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border bg-card/90 shadow-xl backdrop-blur-sm">
          <div className="flex h-1.5 w-full">
            <div className="flex-1 bg-[#002B7F]" />
            <div className="flex-1 bg-[#FCD116]" />
            <div className="flex-1 bg-[#CE1126]" />
          </div>
          <div className="flex flex-col gap-6 p-6">
            <div>
              <h2 className="mb-5 text-center font-heading text-lg font-bold uppercase tracking-wide">
                Autentificare
              </h2>

              <form onSubmit={handleEmailLogin} className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: nume@example.com"
                    autoComplete="email"
                    autoCapitalize="none"
                    required
                    disabled={busy}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email-password">Parolă</Label>
                  <Input
                    id="email-password"
                    type="password"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                    disabled={busy}
                  />
                </div>
                <Button
                  type="submit"
                  className="mt-1 w-full"
                  disabled={busy}
                >
                  {submitting === 'email' && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  {submitting !== 'email' && <Mail className="size-4" />}
                  Intră cu Email
                </Button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  sau
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={handleGoogleLogin}
              >
                {submitting === 'google' ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GoogleGlyph />
                )}
                Continuă cu Google
              </Button>
            </div>

            <div className="border-t border-border pt-5">
              <h3 className="mb-1 text-center text-sm font-semibold text-foreground">
                Cont nemigrat
              </h3>
              <p className="mb-4 text-center text-xs leading-relaxed text-muted-foreground">
                Folosește utilizatorul și parola vechi o singură dată, apoi
                conectează Google sau Email.
              </p>

              <form onSubmit={handleLegacyLogin} className="flex flex-col gap-4">
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
                    disabled={busy}
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
                    disabled={busy}
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="mt-1 w-full"
                  disabled={busy}
                >
                  {submitting === 'legacy' && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Intră cu utilizator
                </Button>
              </form>
            </div>

            <p className="text-center text-xs leading-relaxed text-muted-foreground">
              Conturile sunt create de administrator. Dacă nu ai date de acces,
              contactează-l.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
