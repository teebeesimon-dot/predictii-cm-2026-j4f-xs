'use client'

import useSWR from 'swr'
import {
  getMatches,
  getUsers,
  getAllPredictions,
  getUserPredictions,
  getAvailableEditionIds,
  getUserNotifications,
} from '@/lib/data'
import { useEdition } from '@/components/edition-provider'
import type { AppUser } from '@/lib/types'

// Datele Firestore sunt reîmprospătate explicit după scrieri și după AutoSync.
// Nu revalidăm la fiecare focus/reconnect: pe mobil asta genera în rafală trei
// query-uri identice (meciuri, useri, pronosticuri) la fiecare revenire în app.
const DATA_DEDUPE_MS = 15 * 60 * 1000
const STRUCTURE_DEDUPE_MS = 60 * 60 * 1000

// Edițiile care au meciuri încărcate (pentru selector). Reîmprospătare lejeră
// ca o ediție nou populată să apară fără reîncărcarea paginii.
export function useAvailableEditionIds(refreshMs?: number) {
  return useSWR('available-editions', getAvailableEditionIds, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: STRUCTURE_DEDUPE_MS,
  })
}

// Toate hook-urile de date sunt legate de ediția curentă (competiție + an).
// editionId face parte din cheia SWR, deci la schimbarea ediției datele se
// reîncarcă automat, iar cache-ul fiecărei ediții rămâne separat.

export function useMatches(refreshMs?: number) {
  const { editionId } = useEdition()
  return useSWR(['matches', editionId], () => getMatches(editionId), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DATA_DEDUPE_MS,
  })
}

export function useUsers(refreshMs?: number) {
  return useSWR('users', getUsers, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DATA_DEDUPE_MS,
  })
}

export function useAllPredictions(refreshMs?: number) {
  const { editionId } = useEdition()
  return useSWR(['predictions', editionId], () => getAllPredictions(editionId), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DATA_DEDUPE_MS,
  })
}

export function useUserPredictions(userId: string | undefined) {
  const { editionId } = useEdition()
  return useSWR(
    userId ? ['user-predictions', userId, editionId] : null,
    () => getUserPredictions(userId as string, editionId),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenHidden: false,
      dedupingInterval: DATA_DEDUPE_MS,
    },
  )
}

// Documentul COMPLET al utilizatorului curent (inclusiv `preferences`), extras
// din lista deja încărcată de useUsers(). Nu face nicio citire suplimentară —
// refolosește cache-ul SWR existent al colecției `users`.
export function useCurrentAppUser(userId: string | undefined): AppUser | undefined {
  const { data: users } = useUsers()
  if (!userId) return undefined
  return users?.find((u) => u.id === userId)
}

// Notificările utilizatorului curent pentru Centrul de notificări. O singură
// interogare pe sesiune (dedupe lung, fără revalidare la focus), deci nu adaugă
// citiri repetate pe fiecare pagină.
export function useUserNotifications(userId: string | undefined) {
  return useSWR(
    userId ? ['user-notifications', userId] : null,
    () => getUserNotifications(userId as string),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenHidden: false,
      dedupingInterval: DATA_DEDUPE_MS,
    },
  )
}
