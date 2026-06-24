import { getFlagUrl } from '@/lib/flags'
import { cn } from '@/lib/utils'

// Afișează numele unei echipe împreună cu steagul ei.
// `align` controlează ordinea: 'left' = steag apoi nume (echipa gazdă în dreapta
// terenului folosește 'right' pentru a alinia steagul lângă scor).
export function TeamName({
  team,
  align = 'left',
  className,
  flagSize = 20,
}: {
  team: string
  align?: 'left' | 'right'
  className?: string
  flagSize?: 20 | 40 | 80
}) {
  const flag = getFlagUrl(team, flagSize)
  const dimClass = flagSize >= 40 ? 'h-5 w-7' : 'h-3.5 w-5'

  const flagEl = flag ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flag || '/placeholder.svg'}
      alt=""
      aria-hidden="true"
      className={cn('shrink-0 rounded-sm object-cover shadow-sm', dimClass)}
      loading="lazy"
    />
  ) : null

  const nameEl = <span className="truncate">{team}</span>

  // Pentru echipa gazdă ('right') punem numele întâi și steagul la final, ca
  // steagul să stea lângă scor/„vs". Nu folosim flex-row-reverse fiindcă inversa
  // direcția de aliniere (justify-end) și împingea grupul în partea greșită.
  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
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
