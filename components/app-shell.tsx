'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-provider'
import { AppNav } from '@/components/app-nav'
import { Trophy } from 'lucide-react'

export function AppShell({
  children,
  requireAdmin = false,
}: {
  children: React.ReactNode
  requireAdmin?: boolean
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading) return
    if (!user) {
      router.replace('/')
    } else if (user.mustChangePassword && pathname !== '/account') {
      // Prima logare / parolă resetată: forțează schimbarea parolei.
      router.replace('/account')
    } else if (requireAdmin && !user.isAdmin) {
      router.replace('/dashboard')
    }
  }, [user, loading, requireAdmin, router, pathname])

  const blocked =
    loading ||
    !user ||
    (requireAdmin && !user.isAdmin) ||
    (user.mustChangePassword && pathname !== '/account')

  if (blocked) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Trophy className="size-8 animate-pulse text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <AppNav />
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">{children}</main>
    </div>
  )
}
