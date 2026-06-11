'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  ListChecks,
  Trophy,
  BarChart3,
  Medal,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/components/auth-provider'

const NAV = [
  { href: '/dashboard', label: 'Acasă', icon: LayoutDashboard },
  { href: '/predictions', label: 'Pronosticuri', icon: ListChecks },
  { href: '/standings', label: 'Clasamente', icon: Trophy },
  { href: '/statistics', label: 'Statistici', icon: BarChart3 },
  { href: '/awards', label: 'Premii', icon: Medal },
]

export function AppNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const items = [
    ...NAV,
    ...(user?.isAdmin ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ]

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Trophy className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-heading text-sm font-bold tracking-wide">PREDICTII CM 2026</p>
            <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
              J4F League
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-1">
          <span className="hidden text-sm font-medium text-muted-foreground sm:inline">
            {user?.username}
          </span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Deconectare"
            className="hidden lg:inline-flex"
            onClick={handleLogout}
          >
            <LogOut className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Meniu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-card px-4 py-2 lg:hidden">
          {items.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            )
          })}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm font-medium text-destructive hover:bg-secondary"
          >
            <LogOut className="size-4" />
            Deconectare
          </button>
        </nav>
      )}
    </header>
  )
}
