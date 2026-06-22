'use client'

import Link from 'next/link'
import { usePathname, useSearchParams, useRouter } from 'next/navigation'
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
  ListOrdered,
  UserCog,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/components/auth-provider'
import { EditionSelector } from '@/components/edition-selector'

type NavItem = {
  href: string
  label: string
  icon: React.ElementType
  match: (pathname: string, stage: string | null) => boolean
}

const NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Acasă',
    icon: LayoutDashboard,
    match: (p) => p === '/dashboard',
  },
  {
    href: '/predictions',
    label: 'Pronosticuri',
    icon: ListChecks,
    match: (p) => p === '/predictions',
  },
  {
    href: '/standings',
    label: 'Clasament',
    icon: Trophy,
    match: (p) => p === '/standings',
  },
  {
    href: '/statistics',
    label: 'Statistici',
    icon: BarChart3,
    match: (p) => p === '/statistics',
  },
  {
    href: '/colleagues',
    label: 'Colegii',
    icon: Users,
    match: (p) => p === '/colleagues',
  },
  {
    href: '/awards',
    label: 'Premii',
    icon: Medal,
    match: (p) => p === '/awards',
  },
]

export function AppNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const stage = searchParams.get('stage')
  const router = useRouter()
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)

  const items: NavItem[] = [
    ...NAV,
    {
      href: '/account',
      label: 'Contul meu',
      icon: UserCog,
      match: (p: string) => p === '/account',
    },
    ...(user?.isAdmin
      ? [
          {
            href: '/admin',
            label: 'Administrare',
            icon: Shield,
            match: (p: string) => p === '/admin',
          },
        ]
      : []),
  ]

  function handleLogout() {
    logout()
    router.push('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg">
      {/* Romanian flag accent strip */}
      <div className="flex h-1 w-full">
        <div className="flex-1 bg-[#002B7F]" />
        <div className="flex-1 bg-[#FCD116]" />
        <div className="flex-1 bg-[#CE1126]" />
      </div>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2">
            <img
              src="/j4f-emblem.png"
              alt="Emblema Just4Fun League"
              className="size-9 object-contain"
            />
            <div className="hidden leading-tight sm:block">
              <p className="font-heading text-sm font-bold tracking-wide">
                PREDICTII JUST4FUN
              </p>
              <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                Just4Fun League
              </p>
            </div>
          </Link>
          <EditionSelector />
        </div>

        <nav className="hidden items-center gap-0.5 xl:flex">
          {items.map((item) => {
            const active = item.match(pathname, stage)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium transition-colors',
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
            {user?.name ?? user?.username}
          </span>
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label="Deconectare"
            className="hidden xl:inline-flex"
            onClick={handleLogout}
          >
            <LogOut className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden"
            aria-label="Meniu"
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-card px-4 py-2 xl:hidden">
          {items.map((item) => {
            const active = item.match(pathname, stage)
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
