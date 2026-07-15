'use client'

import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  setDisplayNamePref,
  setResumeCardEnabled,
  setNotificationPreference,
} from '@/lib/data'
import { isNotificationEnabled, isResumeCardEnabled } from '@/lib/preferences'
import {
  NOTIFICATION_CATEGORIES,
  type AppUser,
  type NotificationCategory,
} from '@/lib/types'
import { Loader2, UserCog, Bell, Sparkles } from 'lucide-react'

/**
 * Setările utilizatorului (Faza 3). Operează pe preferințele din documentul
 * `users` deja încărcat; fiecare comutare face o scriere țintită și
 * reîmprospătează cache-ul SWR `users`. Categoriile de notificări sunt
 * enumerate din NOTIFICATION_CATEGORIES, deci categoriile noi apar automat.
 */
export function ProfileSettings({ appUser }: { appUser: AppUser }) {
  const { mutate } = useSWRConfig()
  const prefs = appUser.preferences
  const [name, setName] = useState(prefs?.displayName ?? '')
  const [savingName, setSavingName] = useState(false)

  const refresh = () => mutate('users')

  async function saveName() {
    setSavingName(true)
    try {
      await setDisplayNamePref(appUser.id, name)
      await refresh()
      toast.success('Numele afișat a fost salvat.')
    } catch {
      toast.error('Nu am putut salva numele.')
    } finally {
      setSavingName(false)
    }
  }

  async function toggleResume(enabled: boolean) {
    try {
      await setResumeCardEnabled(appUser.id, enabled)
      await refresh()
    } catch {
      toast.error('Nu am putut salva preferința.')
    }
  }

  async function toggleNotif(
    channel: 'push' | 'inApp',
    category: NotificationCategory,
    enabled: boolean,
  ) {
    try {
      await setNotificationPreference(appUser.id, channel, category, enabled)
      await refresh()
    } catch {
      toast.error('Nu am putut salva preferința.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Nume afișat */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <UserCog className="size-5 text-primary" />
          <CardTitle className="text-base">Nume afișat</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Numele cu care apari în aplicație. Lasă gol pentru a folosi numele
            implicit.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={appUser.name || appUser.username}
              maxLength={40}
            />
            <Button onClick={saveName} disabled={savingName}>
              {savingName && <Loader2 className="size-4 animate-spin" />}
              Salvează
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Afișare rezumat */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Sparkles className="size-5 text-primary" />
          <CardTitle className="text-base">Rezumat pe Acasă</CardTitle>
        </CardHeader>
        <CardContent>
          <SettingSwitch
            label="Afișează cardul de rezumat"
            description="Statistici rapide și acțiuni la deschiderea aplicației."
            checked={isResumeCardEnabled(prefs)}
            onChange={toggleResume}
          />
        </CardContent>
      </Card>

      {/* Preferințe notificări */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <Bell className="size-5 text-primary" />
          <CardTitle className="text-base">Notificări</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <div className="mb-1 grid grid-cols-[1fr_auto_auto] items-center gap-x-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Categorie</span>
            <span className="w-12 text-center">Push</span>
            <span className="w-12 text-center">În app</span>
          </div>
          {NOTIFICATION_CATEGORIES.map((cat, i) => (
            <div key={cat.id}>
              {i > 0 && <Separator className="my-1" />}
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 py-1.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{cat.label}</p>
                  {cat.description && (
                    <p className="text-xs text-muted-foreground">
                      {cat.description}
                    </p>
                  )}
                </div>
                <div className="flex w-12 justify-center">
                  <Switch
                    aria-label={`Push: ${cat.label}`}
                    checked={isNotificationEnabled(prefs, 'push', cat.id)}
                    onCheckedChange={(v) => toggleNotif('push', cat.id, v)}
                  />
                </div>
                <div className="flex w-12 justify-center">
                  <Switch
                    aria-label={`În app: ${cat.label}`}
                    checked={isNotificationEnabled(prefs, 'inApp', cat.id)}
                    onCheckedChange={(v) => toggleNotif('inApp', cat.id, v)}
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

function SettingSwitch({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}
