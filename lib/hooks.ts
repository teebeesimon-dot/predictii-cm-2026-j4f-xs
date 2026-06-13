'use client'

import useSWR from 'swr'
import {
  getMatches,
  getUsers,
  getAllPredictions,
  getUserPredictions,
} from '@/lib/data'

export function useMatches(refreshMs?: number) {
  return useSWR('matches', getMatches, {
    revalidateOnFocus: false,
    refreshInterval: refreshMs ?? 0,
  })
}

export function useUsers(refreshMs?: number) {
  return useSWR('users', getUsers, {
    revalidateOnFocus: false,
    refreshInterval: refreshMs ?? 0,
  })
}

export function useAllPredictions(refreshMs?: number) {
  return useSWR('predictions', getAllPredictions, {
    revalidateOnFocus: false,
    refreshInterval: refreshMs ?? 0,
  })
}

export function useUserPredictions(userId: string | undefined) {
  return useSWR(userId ? ['user-predictions', userId] : null, () =>
    getUserPredictions(userId as string),
  )
}
