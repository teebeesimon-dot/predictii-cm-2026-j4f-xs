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
  if (
    match.liveStatus === null &&
    match.homeScore !== null &&
    match.awayScore !== null
  ) {
    return 'finished'
  }
  if (match.liveStatus) return 'live'
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

export function getLiveMinute(
  match: Pick<Match, 'kickoff'>,
  now = Date.now(),
): number {
  const kickoff = getDisplayedKickoffTimestamp(match.kickoff)
  return Math.max(1, Math.floor((now - kickoff) / 60_000) + 1)
}

export type LivePeriod = 'R1' | 'R2' | 'P1' | 'P2' | 'PK'

export function getLivePeriod(
  match: Pick<Match, 'kickoff' | 'liveStatus'>,
  now = Date.now(),
): LivePeriod {
  if (match.liveStatus === 'PENALTY_SHOOTOUT') return 'PK'

  const minute = getLiveMinute(match, now)
  if (match.liveStatus === 'EXTRA_TIME' || minute > 90) {
    return minute <= 105 ? 'P1' : 'P2'
  }
  return minute <= 45 ? 'R1' : 'R2'
}

export function getLiveLabel(match: Match, now = Date.now()): string {
  const period = getLivePeriod(match, now)
  return period === 'PK' ? period : `${period} · ${getLiveMinute(match, now)}'`
}

export function formatDisplayedKickoffTime(kickoff: string): string {
  return displayedKickoffTimeFormatter.format(new Date(kickoff))
}

export function getDisplayedKickoffGroupKey(kickoff: string): string {
  const date = new Date(kickoff)
  return `${displayedKickoffDayFormatter.format(date)}-${displayedKickoffTimeFormatter.format(date)}`
}
