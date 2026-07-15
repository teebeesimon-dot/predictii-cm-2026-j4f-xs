'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useSWRConfig } from 'swr'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import { useCurrentAppUser, useUserNotifications } from '@/lib/hooks'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
} from '@/lib/data'
import { visibleNotifications, type NotificationView } from '@/lib/notifications-read'
import { deepLinkForNotification } from '@/lib/notifications/categories'
import { NOTIFICATION_CATEGORIES } from '@/lib/types'
import {
  Bell,
  BellOff,
  CheckCheck,
  Trash2,
  ChevronRight,
  Circle,
} from 'lucide-react'

export default function NotificationsPage() {
  return (
    <AppShell>
      <NotificationsContent />
    </AppShell>
  )
}

function formatRelative(ms: number): string {
  if (!ms) return ''
  const diff = Date.now() - ms
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'acum'
  if (min < 60) return `acum ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `acum ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `acum ${d} ${d === 1 ? 'zi' : 'zile'}`
  return new Date(ms).toLocaleDateString('ro-RO', {
    day: 'numeric',
    month: 'short',
  })
}

const CATEGORY_LABEL = new Map(
  NOTIFICATION_CATEGORIES.map((c) => [c.id, c.label]),
)

function NotificationsContent() {
  const { user } = useAuth()
  const { mutate } = useSWRConfig()
  const appUser = useCurrentAppUser(user?.id)
  const { data: notifications, isLoading, mutate: mutateNotifs } =
    useUserNotifications(user?.id)
  const [busy, setBusy] = useState(false)

  const views = useMemo(
    () => visibleNotifications(notifications ?? [], appUser?.preferences),
    [notifications, appUser?.preferences],
  )
  const unread = views.filter((n) => !n.read)
  const read = views.filter((n) => n.read)

  async function refresh() {
    await Promise.all([mutate('users'), mutateNotifs()])
  }

  async function handleMarkRead(key: string) {
    if (!user) return
    await markNotificationRead(user.id, key)
    await refresh()
  }

  async function handleMarkAll() {
    if (!user) return
    setBusy(true)
    try {
      await markAllNotificationsRead(user.id)
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  async function handleClearRead() {
    if (!user) return
    setBusy(true)
    try {
      await clearReadNotifications(
        user.id,
        read.map((n) => n.key),
      )
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="size-6 text-primary" />
          <h1 className="font-heading text-2xl font-bold">Notificări</h1>
          {unread.length > 0 && (
            <Badge className="bg-accent text-accent-foreground">
              {unread.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAll}
            disabled={busy || unread.length === 0}
          >
            <CheckCheck className="size-4" />
            <span className="hidden sm:inline">Marchează tot</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearRead}
            disabled={busy || read.length === 0}
          >
            <Trash2 className="size-4" />
            <span className="hidden sm:inline">Șterge citite</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : views.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <BellOff className="size-10 text-muted-foreground" />
            <p className="font-medium">Nicio notificare</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Aici vor apărea reamintirile de termen limită, anunțurile de etapă
              și actualizările de clasament.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {views.map((n) => (
            <NotificationRow
              key={n.key}
              notif={n}
              onMarkRead={() => handleMarkRead(n.key)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NotificationRow({
  notif,
  onMarkRead,
}: {
  notif: NotificationView
  onMarkRead: () => void
}) {
  const href = deepLinkForNotification(notif.metadata)
  return (
    <Card
      className={
        'transition-colors ' +
        (notif.read ? 'opacity-70' : 'border-primary/30 bg-primary/5')
      }
    >
      <CardContent className="flex items-start gap-3 p-3">
        <div className="mt-1 shrink-0">
          {notif.read ? (
            <Circle className="size-2.5 text-transparent" />
          ) : (
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex size-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-heading text-sm font-bold">
              {notif.title}
            </p>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatRelative(notif.sentAt)}
            </span>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{notif.body}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              {CATEGORY_LABEL.get(notif.category) ?? 'General'}
            </Badge>
            <Link
              href={href}
              onClick={onMarkRead}
              className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
            >
              Deschide
              <ChevronRight className="size-3.5" />
            </Link>
            {!notif.read && (
              <button
                type="button"
                onClick={onMarkRead}
                className="text-xs font-medium text-muted-foreground hover:underline"
              >
                Marchează citit
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
