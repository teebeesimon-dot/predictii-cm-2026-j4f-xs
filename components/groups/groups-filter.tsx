'use client'

import { ChevronDown } from 'lucide-react'
import type { Group } from '@/lib/types'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type GroupsFilterProps = {
  groups: Group[]
  selectedGroupIds: string[]
  onChange: (groupIds: string[]) => void
  className?: string
}

/**
 * Filtru multi-select pentru clasament (și alte pagini).
 * „Toți” / selecție goală = fără filtru.
 */
export function GroupsFilter({
  groups,
  selectedGroupIds,
  onChange,
  className,
}: GroupsFilterProps) {
  const allSelected = selectedGroupIds.length === 0
  const selectedCount = selectedGroupIds.length

  const label = allSelected
    ? 'Toți'
    : selectedCount === 1
      ? (() => {
          const g = groups.find((x) => x.id === selectedGroupIds[0])
          return g ? `${g.emoji} ${g.name}` : '1 grupă'
        })()
      : `${selectedCount} grupe`

  function toggleAll() {
    onChange([])
  }

  function toggleGroup(groupId: string, checked: boolean) {
    if (checked) {
      onChange([...new Set([...selectedGroupIds, groupId])])
    } else {
      onChange(selectedGroupIds.filter((id) => id !== groupId))
    }
  }

  if (groups.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'gap-1.5',
          className,
        )}
      >
        Grupe
        <span className="font-normal text-muted-foreground">{label}</span>
        <ChevronDown className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Filtrează după grupe</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={allSelected}
          onCheckedChange={(checked) => {
            if (checked) toggleAll()
          }}
        >
          Toți
        </DropdownMenuCheckboxItem>
        <DropdownMenuSeparator />
        {groups.map((g) => (
          <DropdownMenuCheckboxItem
            key={g.id}
            checked={selectedGroupIds.includes(g.id)}
            onCheckedChange={(checked) =>
              toggleGroup(g.id, checked === true)
            }
          >
            <span className="inline-flex items-center gap-2">
              <span className="text-base leading-none">{g.emoji}</span>
              <span>{g.name}</span>
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
