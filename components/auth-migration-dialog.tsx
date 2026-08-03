'use client'

import { useState } from 'react'
import { BrandLogo } from '@/components/brand-logo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail } from 'lucide-react'
import { GoogleGlyph } from '@/components/google-glyph'

type Step = 'choose' | 'email'

export function AuthMigrationDialog({
  username,
  busy,
  onGoogle,
  onEmail,
  onCancel,
}: {
  username: string
  busy: boolean
  onGoogle: () => Promise<void>
  onEmail: (email: string) => Promise<{ ok: boolean; error?: string }>
  onCancel: () => void
}) {
  const [step, setStep] = useState<Step>('choose')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const locked = busy || submitting

  async function handleGoogle() {
    setError(null)
    setSubmitting(true)
    try {
      await onGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la autentificarea Google.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await onEmail(email)
      if (!res.ok) setError(res.error ?? 'Nu am putut continua cu email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la crearea contului.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-20 dark:opacity-15"
        style={{ backgroundImage: 'url(/stadium-night.png)' }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background"
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-migration-title"
        className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card/95 shadow-xl backdrop-blur-sm"
      >
        <div className="flex h-1.5 w-full">
          <div className="flex-1 bg-[#002B7F]" />
          <div className="flex-1 bg-[#FCD116]" />
          <div className="flex-1 bg-[#CE1126]" />
        </div>

        <div className="flex flex-col gap-5 p-6">
          <div className="flex flex-col items-center text-center">
            <BrandLogo size="nav" />
            <h1
              id="auth-migration-title"
              className="mt-4 font-heading text-2xl font-bold uppercase tracking-wide"
            >
              Actualizare cont
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">@{username}</p>
            <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">
              SKUPA folosește acum un sistem nou de autentificare.
              <br />
              Pentru a continua trebuie să îți conectezi contul.
              <br />
              Alege una dintre opțiuni.
            </p>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          {step === 'choose' ? (
            <div className="flex flex-col gap-3">
              <Button
                type="button"
                className="w-full"
                disabled={locked}
                onClick={handleGoogle}
              >
                {locked ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GoogleGlyph />
                )}
                Continuă cu Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={locked}
                onClick={() => {
                  setError(null)
                  setStep('email')
                }}
              >
                <Mail className="size-4" />
                Continuă cu Email
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                disabled={locked}
                onClick={onCancel}
              >
                Anulează
              </Button>
            </div>
          ) : (
            <form onSubmit={handleEmail} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="migration-email">Email</Label>
                <Input
                  id="migration-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: nume@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  required
                  disabled={locked}
                />
              </div>
              <Button type="submit" className="w-full" disabled={locked}>
                {locked && <Loader2 className="size-4 animate-spin" />}
                Continuă
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={locked}
                onClick={() => {
                  setError(null)
                  setStep('choose')
                }}
              >
                Înapoi
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
