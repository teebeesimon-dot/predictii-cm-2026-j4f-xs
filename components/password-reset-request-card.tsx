'use client'

import { useState } from 'react'
import type { AppUser } from '@/lib/types'
import {
  isUserMigratedForPasswordReset,
  requestPasswordResetEmail,
} from '@/lib/auth-password-reset'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

/** Secțiune Cont: trimite email de resetare pentru useri migrați. */
export function PasswordResetRequestCard({
  appUser,
}: {
  appUser: AppUser | null | undefined
}) {
  const [sending, setSending] = useState(false)
  const migrated = appUser ? isUserMigratedForPasswordReset(appUser) : false

  async function handleSend() {
    if (!appUser?.email) return
    setSending(true)
    try {
      const res = await requestPasswordResetEmail(appUser.email)
      if (res.ok) {
        toast.success(res.message)
      } else {
        toast.error(res.error)
      }
    } catch {
      toast.error('Nu am putut trimite emailul. Încearcă din nou.')
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <KeyRound className="size-5 text-primary" />
        <CardTitle className="text-base">Parolă</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {!migrated ? (
          <p className="text-sm text-muted-foreground">
            Contul tău nu este încă migrat la noul sistem de autentificare.
          </p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Trimite un email de resetare la{' '}
              <span className="font-medium text-foreground">{appUser?.email}</span>.
            </p>
            <Button
              type="button"
              variant="outline"
              disabled={sending}
              onClick={handleSend}
              className="self-start"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Trimite email pentru resetarea parolei
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
