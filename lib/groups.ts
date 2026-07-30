import type { Group } from '@/lib/types'
import type { StandingRow } from '@/lib/data'

const RECENT_EMOJI_KEY = 'skupa_recent_emojis'
const RECENT_EMOJI_LIMIT = 24

/** Grupele din care face parte un utilizator (pentru badge-uri etc.). */
export function groupsForUser(groups: Group[], userId: string): Group[] {
  return groups.filter((g) => g.members.includes(userId))
}

/** Map userId → grupe, util pe pagini cu multe rânduri. */
export function buildUserGroupsMap(
  groups: Group[],
): Map<string, Group[]> {
  const map = new Map<string, Group[]>()
  for (const group of groups) {
    for (const userId of group.members) {
      const list = map.get(userId)
      if (list) list.push(group)
      else map.set(userId, [group])
    }
  }
  return map
}

/**
 * Setul de userId care aparțin cel puțin unei grupe selectate.
 * Returnează `null` când nu există filtru activ (Toți / selecție goală).
 */
export function memberIdsForSelectedGroups(
  groups: Group[],
  selectedGroupIds: string[],
): Set<string> | null {
  if (selectedGroupIds.length === 0) return null
  const selected = new Set(selectedGroupIds)
  const memberIds = new Set<string>()
  for (const group of groups) {
    if (!selected.has(group.id)) continue
    for (const userId of group.members) memberIds.add(userId)
  }
  return memberIds
}

/** Filtrează rândurile de clasament fără a recalcula punctajul/rangul. */
export function filterStandingRowsByGroups(
  rows: StandingRow[],
  groups: Group[],
  selectedGroupIds: string[],
): StandingRow[] {
  const memberIds = memberIdsForSelectedGroups(groups, selectedGroupIds)
  if (!memberIds) return rows
  return rows.filter((row) => memberIds.has(row.userId))
}

export function readRecentEmojis(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_EMOJI_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter((x): x is string => typeof x === 'string').slice(0, RECENT_EMOJI_LIMIT)
  } catch {
    return []
  }
}

export function rememberEmoji(emoji: string): string[] {
  const next = [emoji, ...readRecentEmojis().filter((e) => e !== emoji)].slice(
    0,
    RECENT_EMOJI_LIMIT,
  )
  try {
    localStorage.setItem(RECENT_EMOJI_KEY, JSON.stringify(next))
  } catch {
    // ignore quota / private mode
  }
  return next
}
