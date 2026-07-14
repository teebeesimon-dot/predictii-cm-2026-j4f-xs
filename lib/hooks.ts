'use client'

import useSWR from 'swr'
import {
  getMatches,
  getUsers,
  getAllPredictions,
  getUserPredictions,
  getAvailableEditionIds,
} from '@/lib/data'
import { useEdition } from '@/components/edition-provider'

// Fereastră de deduplicare: SWR nu re-execută fetcher-ul pentru aceeași cheie
// mai des de atât. Fiecare fetch citește colecții întregi din Firestore, deci
// asta previne recitirile la navigarea între pagini (dashboard, clasament,
// statistici, premii, colegii folosesc aceleași chei) și la focus-urile
// repetate pe tab. Datele rămân proaspete: AutoSync reîmprospătează explicit
// toate cheile când apar scoruri noi.
const DEDUPE_MS = 5 * 60 * 1000 // 5 minute

// Edițiile care au meciuri încărcate (pentru selector). Reîmprospătare lejeră
// ca o ediție nou populată să apară fără reîncărcarea paginii.
export function useAvailableEditionIds(refreshMs?: number) {
  return useSWR('available-editions', getAvailableEditionIds, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DEDUPE_MS,
  })
}

// Toate hook-urile de date sunt legate de ediția curentă (competiție + an).
// editionId face parte din cheia SWR, deci la schimbarea ediției datele se
// reîncarcă automat, iar cache-ul fiecărei ediții rămâne separat.

export function useMatches(refreshMs?: number) {
  const { editionId } = useEdition()
  return useSWR(['matches', editionId], () => getMatches(editionId), {
    // Reîmprospătează imediat când utilizatorul redeschide aplicația/tab-ul sau
    // revine online, ca să nu vadă scoruri vechi din cache (mai ales pe mobil).
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DEDUPE_MS,
  })
}

export function useUsers(refreshMs?: number) {
  return useSWR('users', getUsers, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DEDUPE_MS,
  })
}

export function useAllPredictions(refreshMs?: number) {
  const { editionId } = useEdition()
  return useSWR(['predictions', editionId], () => getAllPredictions(editionId), {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    refreshInterval: refreshMs ?? 0,
    refreshWhenHidden: false,
    dedupingInterval: DEDUPE_MS,
  })
}

export function useUserPredictions(userId: string | undefined) {
  const { editionId } = useEdition()
  return useSWR(
    userId ? ['user-predictions', userId, editionId] : null,
    () => getUserPredictions(userId as string, editionId),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshWhenHidden: false,
      dedupingInterval: DEDUPE_MS,
    },
  )
}
