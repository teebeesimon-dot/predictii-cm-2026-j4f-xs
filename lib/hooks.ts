'use client'

import useSWR from 'swr'
import {
  getMatches,
  getUsers,
  getAllPredictions,
  getUserPredictions,
} from '@/lib/data'

export function useMatches() {
  return useSWR('matches', getMatches, { revalidateOnFocus: false })
}

export function useUsers() {
  return useSWR('users', getUsers, { revalidateOnFocus: false })
}

export function useAllPredictions() {
  return useSWR('predictions', getAllPredictions, { revalidateOnFocus: false })
}

export function useUserPredictions(userId: string | undefined) {
  return useSWR(userId ? ['user-predictions', userId] : null, () =>
    getUserPredictions(userId as string),
  )
}
