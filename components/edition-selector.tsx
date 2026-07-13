'use client'

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import { ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  COMPETITIONS,
  COMPETITION_ORDER,
  EDITIONS,
  formatSeasonYear,
  type CompetitionId,
} from '@/lib/editions'
import { hasEditionAccess } from '@/lib/types'
import { useEdition } from '@/components/edition-provider'
import { useAuth } from '@/components/auth-provider'
import { useAvailableEditionIds } from '@/lib/hooks'
import { cn } from '@/lib/utils'

export function EditionSelector() {
  const { user } = useAuth()
  const { editionId, edition, competition, setEditionId } = useEdition()
  const { data: availableIds } = useAvailableEditionIds(60_000)

  const isAdmin = user?.isAdmin === true

  // Edițiile vizibile pentru utilizatorul curent:
  //  - adminii văd toate edițiile predefinite;
  //  - jucătorii văd doar edițiile care au meciuri ÎNCĂRCATE și la care au acces.
  const visible = useMemo(() => {
    const available = new Set(availableIds ?? [])
    return EDITIONS.filter((e) => {
      if (isAdmin) return true
      if (!available.has(e.id)) return false
      return user ? hasEditionAccess(user, e.id) : false
    })
  }, [availableIds, isAdmin, user])

  // Competițiile care au cel puțin o ediție vizibilă, în ordinea de afișare.
  const competitions = useMemo(
    () =>
      COMPETITION_ORDER.filter((c) =>
        visible.some((e) => e.competitionId === c),
      ),
    [visible],
  )

  // Anii vizibili pentru competiția selectată (crescător).
  const years = useMemo(
    () =>
      visible
        .filter((e) => e.competitionId === edition.competitionId)
        .map((e) => e.year)
        .sort((a, b) => a - b),
    [visible, edition.competitionId],
  )

  // Dacă ediția curentă nu mai e vizibilă (ex. jucător fără acces), comutăm pe
  // prima ediție vizibilă disponibilă.
  useEffect(() => {
    if (visible.length === 0) return
    if (!visible.some((e) => e.id === editionId)) {
      setEditionId(visible[0].id)
    }
  }, [visible, editionId, setEditionId])

  if (visible.length === 0) return null

  const selectCompetition = (c: CompetitionId) => {
    const yrs = visible
      .filter((e) => e.competitionId === c)
      .map((e) => e.year)
      .sort((a, b) => a - b)
    if (yrs.length === 0) return
    // Păstrăm anul curent dacă există la noua competiție, altfel primul an.
    const year = yrs.includes(edition.year) ? edition.year : yrs[0]
    setEditionId(`${c}-${year}`)
  }

  return (
    <div className="flex items-center gap-1.5">
      {/* Competiție */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/70">
          <span className="max-w-[120px] truncate">{competition.short}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-44">
          {competitions.map((c) => (
            <DropdownMenuItem
              key={c}
              onClick={() => selectCompetition(c)}
              className="gap-2"
            >
              <Image
                src={COMPETITIONS[c].logo || '/placeholder.svg'}
                alt=""
                width={18}
                height={18}
                className="size-[18px] rounded object-contain"
              />
              <span className="flex-1">{COMPETITIONS[c].short}</span>
              {c === edition.competitionId && (
                <Check className="size-4 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* An */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 whitespace-nowrap rounded-md border border-border bg-secondary px-2.5 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-secondary/70">
          {formatSeasonYear(edition.competitionId, edition.year)}
          <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-24">
          {years.map((y) => (
            <DropdownMenuItem
              key={y}
              onClick={() => setEditionId(`${edition.competitionId}-${y}`)}
              className={cn(
                'gap-2',
                y === edition.year && 'font-semibold',
              )}
            >
              <span className="flex-1">
                {formatSeasonYear(edition.competitionId, y)}
              </span>
              {y === edition.year && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
