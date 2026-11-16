'use client'

import useSWR from 'swr'
import {
  getMatches,
  getUsers,
  getUserById,
  getAllPredictions,
  getUserPredictions,
  getAvailableEditionIds,
  getUserNotifications,
  getGroups,
  getStagePayments,
} from '@/lib/data'
import { useEdition } from '@/components/edition-provider'
import type { AppUser } from '@/lib/types'
import { auth } from '@/lib/firebase'

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

export function useAllPredictions(refreshMs?: number, enabled = true) {
  const { editionId } = useEdition()
  return useSWR(enabled ? ['predictions', editionId] : null, () => getAllPredictions(editionId), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DATA_DEDUPE_MS,
  })
}


export interface LeaderboardSummary {
  id: string
  userId: string
  editionId: string
  points: number
  exact: number
  correct1x2: number
  played: number
  predictionsCount?: number
  stages?: Record<string, { points: number; exact: number; correct1x2: number; played: number }>
}

async function fetchLeaderboardSummaries(editionId: string): Promise<LeaderboardSummary[]> {
  const currentUser = auth.currentUser
  if (!currentUser) throw new Error('Autentificarea este necesara pentru clasamente.')
  const token = await currentUser.getIdToken()
  const response = await fetch(`/api/leaderboard-summaries?editionId=${encodeURIComponent(editionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Nu am putut incarca statisticile clasamentului.')
  return (payload.summaries ?? []) as LeaderboardSummary[]
}

export function useLeaderboardSummaries(enabled = true) {
  const { editionId } = useEdition()
  return useSWR(enabled ? ['leaderboard-summaries', editionId] : null, () => fetchLeaderboardSummaries(editionId), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshWhenHidden: false,
    dedupingInterval: 1000,
  })
}

export function useGroups(refreshMs?: number) {
  const { editionId } = useEdition()
  return useSWR(['groups', editionId], () => getGroups(editionId), {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DATA_DEDUPE_MS,
  })
}

export function useStagePayments(refreshMs?: number) {
  const { editionId } = useEdition()
  return useSWR(['stage-payments', editionId], () => getStagePayments(editionId), {
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

// Profilul utilizatorului curent se citește individual, nu prin descărcarea
// întregii colecții `users`. Cache-ul SWR evită citirile repetate între pagini.
export function useCurrentAppUser(userId: string | undefined) {
  return useSWR(
    userId ? ['user', userId] : null,
    () => getUserById(userId as string),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshWhenHidden: false,
      dedupingInterval: DATA_DEDUPE_MS,
    },
  ).data
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
