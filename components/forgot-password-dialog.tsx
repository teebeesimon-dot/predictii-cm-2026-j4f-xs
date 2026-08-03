'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import {
  PASSWORD_RESET_GENERIC_SUCCESS,
  requestPasswordResetEmail,
} from '@/lib/auth-password-reset'

export function ForgotPasswordDialog({
  open,
  onClose,
  initialEmail = '',
}: {
  open: boolean
  onClose: () => void
  initialEmail?: string
}) {
  const [email, setEmail] = useState(initialEmail)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setEmail(initialEmail)
    setError(null)
    setSuccess(null)
  }, [open, initialEmail])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const res = await requestPasswordResetEmail(email)
      if (res.ok) {
        setSuccess(res.message)
      } else {
        setError(res.error)
      }
    } catch {
      setError('Nu am putut trimite emailul. Încearcă din nou.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (submitting) return
    setError(null)
    setSuccess(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 px-4 py-10 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="forgot-password-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
      >
        <div className="flex flex-col gap-4 p-6">
          <div>
            <h2
              id="forgot-password-title"
              className="font-heading text-lg font-bold uppercase tracking-wide"
            >
              Resetare parolă
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Introdu emailul contului migrat. Dacă există, vei primi instrucțiuni
              de resetare.
            </p>
          </div>

          {success ? (
            <div className="flex flex-col gap-4">
              <p className="rounded-lg border border-border bg-secondary/40 px-3 py-3 text-sm text-foreground">
                {success || PASSWORD_RESET_GENERIC_SUCCESS}
              </p>
              <Button type="button" onClick={handleClose}>
                Închide
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="forgot-email">Email</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: nume@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  required
                  disabled={submitting}
                />
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row-reverse">
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting && <Loader2 className="size-4 animate-spin" />}
                  Trimite email de resetare
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1"
                  disabled={submitting}
                  onClick={handleClose}
                >
                  Anulează
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
