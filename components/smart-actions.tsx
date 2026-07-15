'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import {
  ClipboardList,
  Trophy,
  Flag,
  ChevronRight,
  Bell,
  BarChart3,
} from 'lucide-react'

export interface SmartAction {
  href: string
  label: string
  icon: React.ElementType
  badge?: string
  tone?: 'primary' | 'accent' | 'default'
}

/**
 * Acțiuni contextuale afișate sub cardul de rezumat. Primește lista deja
 * filtrată de dashboard (doar acțiunile relevante pentru utilizatorul curent),
 * deci componenta rămâne pur prezentațională și reutilizabilă.
 */
export function SmartActions({ actions }: { actions: SmartAction[] }) {
  if (actions.length === 0) return null
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {actions.map((a) => (
        <Link key={a.href + a.label} href={a.href} className="group">
          <Card
            className={
              'h-full transition-colors ' +
              (a.tone === 'primary'
                ? 'border-primary/40 bg-primary/5 hover:border-primary'
                : a.tone === 'accent'
                  ? 'border-accent/40 bg-accent/10 hover:border-accent'
                  : 'hover:border-primary/40')
            }
          >
            <CardContent className="flex items-center gap-2 p-3">
              <a.icon
                className={
                  'size-5 shrink-0 ' +
                  (a.tone === 'primary'
                    ? 'text-primary'
                    : a.tone === 'accent'
                      ? 'text-accent'
                      : 'text-muted-foreground')
                }
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">
                {a.label}
              </span>
              {a.badge ? (
                <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-accent-foreground">
                  {a.badge}
                </span>
              ) : (
                <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

// Iconițe reexportate pentru comoditate la construirea listei în dashboard.
export const SmartActionIcons = {
  predictions: ClipboardList,
  standings: Trophy,
  results: Flag,
  stage: BarChart3,
  notifications: Bell,
}
