'use client'

import { useMemo } from 'react'
import { AppShell } from '@/components/app-shell'
import { useAuth } from '@/components/auth-provider'
import {
  useUsers,
  useMatches,
  useAllPredictions,
  useCurrentAppUser,
  useUserNotifications,
} from '@/lib/hooks'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { PasswordCard } from '@/components/password-card'
import { PersonalDashboard } from '@/components/personal-dashboard'
import { ProfileSettings } from '@/components/profile-settings'
import { displayNameOf, favouriteTeamOf, initialsOf } from '@/lib/preferences'
import { EDITIONS } from '@/lib/editions'
import { hasEditionAccess } from '@/lib/types'
import { ShieldAlert, Star, Trophy } from 'lucide-react'

export default function AccountPage() {
  return (
    <AppShell>
      <AccountContent />
    </AppShell>
  )
}

function AccountContent() {
  const { user } = useAuth()
  const forced = user?.mustChangePassword === true

  const appUser = useCurrentAppUser(user?.id)
  const { data: users } = useUsers()
  const { data: matches } = useMatches()
  const { data: predictions } = useAllPredictions()
  const { data: notifications } = useUserNotifications(user?.id)

  // Competițiile la care utilizatorul are acces (fără citiri noi — se derivă
  // din registrul static de ediții + câmpul `access` deja încărcat).
  const joinedEditions = useMemo(() => {
    if (!appUser) return []
    return EDITIONS.filter((e) => hasEditionAccess(appUser, e.id))
  }, [appUser])

  if (!user) return null

  const shownName = appUser ? displayNameOf(appUser) : user.name ?? user.username
  const favourite = favouriteTeamOf(appUser?.preferences)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      {/* Antet profil */}
      <div className="flex items-center gap-4">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
          {initialsOf(shownName)}
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-heading text-2xl font-bold">{shownName}</h1>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          {favourite && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="size-3.5 text-accent" />
              {favourite}
            </p>
          )}
        </div>
      </div>

      {forced && (
        <div className="flex items-start gap-3 rounded-lg border border-accent/40 bg-accent/10 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-accent" />
          <div>
            <p className="font-semibold text-foreground">
              Schimbă-ți parola pentru a continua
            </p>
            <p className="text-sm text-muted-foreground">
              Folosești o parolă implicită. Din motive de securitate, te rugăm
              să-ți alegi o parolă nouă înainte de a folosi aplicația.
            </p>
          </div>
        </div>
      )}

      <Tabs defaultValue={forced ? 'settings' : 'dashboard'} className="w-full">
        <TabsList className="w-full">
          <TabsTrigger value="dashboard" className="flex-1">
            Statistici
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex-1">
            Profil
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            Setări
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <PersonalDashboard
            userId={user.id}
            users={users ?? []}
            matches={matches ?? []}
            predictions={predictions ?? []}
            notifications={notifications ?? []}
            editionCount={joinedEditions.length}
          />
        </TabsContent>

        <TabsContent value="profile" className="mt-4">
          <div className="flex flex-col gap-4">
            <Card>
              <CardContent className="flex flex-col gap-4 pt-6">
                <div className="flex justify-between gap-4 border-b border-border pb-3">
                  <span className="text-sm text-muted-foreground">Nume afișat</span>
                  <span className="text-sm font-medium text-foreground">{shownName}</span>
                </div>
                <div className="flex justify-between gap-4 border-b border-border pb-3">
                  <span className="text-sm text-muted-foreground">Utilizator</span>
                  <span className="text-sm font-medium text-foreground">@{user.username}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-sm text-muted-foreground">Echipă favorită</span>
                  <span className="text-sm font-medium text-foreground">
                    {favourite || '—'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
                <Trophy className="size-5" />
                Competiții
              </h2>
              {joinedEditions.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
                  Nu ești înscris în nicio competiție.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {joinedEditions.map((e) => (
                    <li
                      key={e.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <Trophy className="size-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{e.label}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <div className="flex flex-col gap-6">
            {appUser && <ProfileSettings appUser={appUser} />}
            <PasswordCard forced={forced} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
