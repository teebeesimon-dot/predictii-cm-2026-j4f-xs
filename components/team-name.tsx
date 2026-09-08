import {
  TEAM_IMAGES_BY_COMPETITION,
  type CompetitionId,
} from '@/lib/editions'
import { getFlagUrl } from '@/lib/flags'
import { getTeamImage } from '@/lib/team-images'
import { cn } from '@/lib/utils'

// Afișează numele unei echipe împreună cu steagul ei.
// `align` controlează ordinea: 'left' = steag apoi nume (echipa gazdă în dreapta
// terenului folosește 'right' pentru a alinia steagul lângă scor).
export function TeamName({
  team,
  competition,
  align = 'left',
  className,
  flagSize = 20,
  wrap = false,
}: {
  team: string
  competition?: CompetitionId
  align?: 'left' | 'right'
  className?: string
  flagSize?: 20 | 40 | 80
  wrap?: boolean
}) {
  const flag = competition
    ? getTeamImage(team, competition, flagSize)
    : getFlagUrl(team, flagSize)
  const isClubLogo =
    competition !== undefined &&
    TEAM_IMAGES_BY_COMPETITION[competition] === 'clubs'
  const logoFrameClass = isClubLogo
    ? flagSize >= 40
      ? 'size-10'
      : 'size-8'
    : flagSize >= 40
      ? 'h-5 w-7'
      : 'h-3.5 w-5'

  const flagEl = (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center',
        logoFrameClass,
      )}
    >
      {flag ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={flag}
          alt=""
          aria-hidden="true"
          width={isClubLogo ? 40 : flagSize}
          height={isClubLogo ? 40 : flagSize}
          className={cn(
            'max-h-full max-w-full rounded-sm',
            isClubLogo ? 'object-contain' : 'object-cover',
          )}
          loading="lazy"
          decoding="async"
          onError={(event) => {
            event.currentTarget.style.visibility = 'hidden'
          }}
        />
      ) : null}
    </span>
  )

  const nameEl = (
    <span
      className={cn(
        wrap ? 'whitespace-normal break-words' : 'truncate',
      )}
    >
      {team}
    </span>
  )

  // Pentru echipa gazdă ('right') punem numele întâi și steagul la final, ca
  // steagul să stea lângă scor/„vs". Nu folosim flex-row-reverse fiindcă inversa
  // direcția de aliniere (justify-end) și împingea grupul în partea greșită.
  return (
    <span
      className={cn(
        'flex min-w-0 items-center',
        isClubLogo ? 'gap-2.5' : 'gap-2',
        className,
      )}
    >
      {align === 'right' ? (
        <>
          {nameEl}
          {flagEl}
        </>
      ) : (
        <>
          {flagEl}
          {nameEl}
        </>
      )}
    </span>
  )
}
