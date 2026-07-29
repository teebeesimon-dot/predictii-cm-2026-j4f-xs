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
}: {
  team: string
  competition?: CompetitionId
  align?: 'left' | 'right'
  className?: string
  flagSize?: 20 | 40 | 80
}) {
  const flag = competition
    ? getTeamImage(team, competition, flagSize)
    : getFlagUrl(team, flagSize)
  const isClubLogo =
    competition !== undefined &&
    TEAM_IMAGES_BY_COMPETITION[competition] === 'clubs'
  const dimClass = isClubLogo
    ? flagSize >= 40
      ? 'size-10'
      : 'size-7'
    : flagSize >= 40
      ? 'h-5 w-7'
      : 'h-3.5 w-5'
  const targetClubSize = flagSize >= 40 ? 40 : 28

  const flagEl = flag ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flag || '/placeholder.svg'}
      alt=""
      aria-hidden="true"
      width={isClubLogo ? targetClubSize * 2 : flagSize}
      height={isClubLogo ? targetClubSize * 2 : flagSize}
      className={cn(
        'shrink-0 rounded-sm shadow-sm',
        isClubLogo ? 'object-contain' : 'object-cover',
        dimClass,
      )}
      loading="lazy"
      decoding="async"
      onLoad={(event) => {
        if (!isClubLogo) return
        const image = event.currentTarget
        const pixelRatio = window.devicePixelRatio || 1
        const maxCssWidth = image.naturalWidth / pixelRatio
        const maxCssHeight = image.naturalHeight / pixelRatio
        if (maxCssWidth < targetClubSize || maxCssHeight < targetClubSize) {
          image.style.width = `${Math.min(targetClubSize, maxCssWidth)}px`
          image.style.height = `${Math.min(targetClubSize, maxCssHeight)}px`
        }
      }}
      onError={(event) => {
        event.currentTarget.style.display = 'none'
      }}
    />
  ) : null

  const nameEl = <span className="truncate">{team}</span>

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
