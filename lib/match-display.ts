import type { Match } from '@/lib/types'

export const MATCH_LIVE_WINDOW_MS = 2.5 * 60 * 60 * 1000

const displayedKickoffTimeFormatter = new Intl.DateTimeFormat('ro-RO', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'Europe/Bucharest',
})

const displayedKickoffDayFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Europe/Bucharest',
})

export type MatchDisplayStatus =
  | 'upcoming'
  | 'live'
  | 'finished'
  | 'unknown'

function getDisplayedKickoffTimestamp(kickoff: string): number {
  const date = new Date(kickoff)
  date.setSeconds(0, 0)
  return date.getTime()
}

export function getMatchDisplayStatus(
  match: Match,
  now = Date.now(),
): MatchDisplayStatus {
  const kickoff = getDisplayedKickoffTimestamp(match.kickoff)
  if (now < kickoff) return 'upcoming'
  if (now <= kickoff + MATCH_LIVE_WINDOW_MS) return 'live'
  if (match.homeScore !== null && match.awayScore !== null) return 'finished'
  return 'unknown'
}

export function getActiveMatchBatch(matches: Match[], now = Date.now()): Match[] {
  const sorted = [...matches].sort(
    (a, b) => +new Date(a.kickoff) - +new Date(b.kickoff),
  )
  const live = sorted.filter(
    (match) => getMatchDisplayStatus(match, now) === 'live',
  )
  if (live.length > 0) return live

  const nextMatch = sorted.find(
    (match) => getMatchDisplayStatus(match, now) === 'upcoming',
  )
  if (!nextMatch) return []

  const nextKickoffGroup = getDisplayedKickoffGroupKey(nextMatch.kickoff)
  return sorted.filter(
    (match) =>
      getMatchDisplayStatus(match, now) === 'upcoming' &&
      getDisplayedKickoffGroupKey(match.kickoff) === nextKickoffGroup,
  )
}

export function formatDisplayedKickoffTime(kickoff: string): string {
  return displayedKickoffTimeFormatter.format(new Date(kickoff))
}

export function getDisplayedKickoffGroupKey(kickoff: string): string {
  const date = new Date(kickoff)
  return `${displayedKickoffDayFormatter.format(date)}-${displayedKickoffTimeFormatter.format(date)}`
}
