'use client'

/**
 * Hook principal pentru achievements.
 *
 * Refolosește datele din cache-ul SWR existent (useUsers, useMatches,
 * useAllPredictions) — zero citiri Firestore suplimentare. Persistă
 * deblocările noi cu un singur updateDoc.
 */

import { useEffect, useRef, useMemo } from 'react'
import { mutate } from 'swr'
import { useUsers, useMatches, useAllPredictions } from '@/lib/hooks'
import { useAuth } from '@/components/auth-provider'
import {
  computeAchievements,
  computePersonalRecords,
  findNewlyUnlocked,
} from '@/lib/achievements/compute'
import { saveAchievements, mergeAchievements } from '@/lib/achievements/data'
import type { AchievementState, StoredAchievements } from '@/lib/achievements/types'

export interface UseAchievementsResult {
  states: AchievementState[]
  unlocked: AchievementState[]
  locked: AchievementState[]
  totalMedals: { bronze: number; silver: number; gold: number }
  isLoading: boolean
}

export function useAchievements(): UseAchievementsResult {
  const { user } = useAuth()
  const { data: users, isLoading: l1 } = useUsers()
  const { data: matches, isLoading: l2 } = useMatches()
  const { data: predictions, isLoading: l3 } = useAllPredictions()

  const isLoading = l1 || l2 || l3
  const persistedRef = useRef(false)

  const appUser = useMemo(
    () => (users && user ? users.find((u) => u.id === user.id) : undefined),
    [users, user],
  )

  const states = useMemo<AchievementState[]>(() => {
    if (!appUser || !users || !matches || !predictions) return []
    return computeAchievements(appUser, users, matches, predictions)
  }, [appUser, users, matches, predictions])

  // Persists newly unlocked achievements once per session (idempotent).
  useEffect(() => {
    if (!appUser || !users || !matches || !predictions) return
    if (persistedRef.current) return
    if (states.length === 0) return

    const stored: StoredAchievements = (appUser as any).achievements ?? {
      unlocked: {},
    }
    const newlyUnlocked = findNewlyUnlocked(states, stored)
    const records = computePersonalRecords(appUser, users, matches, predictions)

    const hasNew = newlyUnlocked.length > 0
    const hasRecordChange =
      !stored.personalRecords ||
      records.highestRank !== stored.personalRecords.highestRank ||
      records.longestPredictionStreak !==
        stored.personalRecords.longestPredictionStreak ||
      records.bestRoundPoints !== stored.personalRecords.bestRoundPoints ||
      records.mostExactInRound !== stored.personalRecords.mostExactInRound

    if (!hasNew && !hasRecordChange) {
      persistedRef.current = true
      return
    }

    const newMap: Record<string, number> = {}
    for (const s of newlyUnlocked) {
      newMap[s.def.id] = Date.now()
    }

    const merged = mergeAchievements(stored, newMap, records)
    persistedRef.current = true

    saveAchievements(appUser.id, merged)
      .then(() => {
        // Reîmprospătează cache-ul SWR al utilizatorilor ca UI-ul să reflecte
        // imediat noua stare fără o reîncărcare completă.
        mutate('users')
      })
      .catch(() => {
        // Eșecul e silențios: la next load se va reîncerca.
        persistedRef.current = false
      })
  }, [states, appUser, users, matches, predictions])

  const unlocked = useMemo(() => states.filter((s) => s.unlocked), [states])
  const locked = useMemo(() => states.filter((s) => !s.unlocked), [states])

  const totalMedals = useMemo(() => {
    const counts = { bronze: 0, silver: 0, gold: 0 }
    for (const s of unlocked) {
      if (s.def.medal === 'bronze') counts.bronze++
      else if (s.def.medal === 'silver') counts.silver++
      else if (s.def.medal === 'gold') counts.gold++
    }
    return counts
  }, [unlocked])

  return { states, unlocked, locked, totalMedals, isLoading }
}
