import Link from 'next/link'

export function MatchPredictionsLink({
  matchId,
  children,
  className,
  ariaLabel,
}: {
  matchId: string
  children: React.ReactNode
  className?: string
  ariaLabel: string
}) {
  return (
    <Link
      href={`/match/${encodeURIComponent(matchId)}`}
      className={className}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  )
}
