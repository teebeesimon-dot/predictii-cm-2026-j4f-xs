'use client'

import { type StandingRow } from '@/lib/data'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Trophy } from 'lucide-react'

export function StandingsTable({
  rows,
  highlightUserId,
}: {
  rows: StandingRow[]
  highlightUserId?: string
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        Niciun punctaj încă. Clasamentul apare după primele rezultate oficiale.
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-secondary/60">
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Jucător</TableHead>
            <TableHead className="text-center">Pct</TableHead>
            <TableHead className="hidden text-center sm:table-cell">Exact</TableHead>
            <TableHead className="hidden text-center sm:table-cell">1X2</TableHead>
            <TableHead className="hidden text-center md:table-cell">Jucate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const rank = row.rank
            const isMe = row.userId === highlightUserId
            return (
              <TableRow
                key={row.userId}
                className={cn(
                  isMe &&
                    'border-l-4 border-l-primary bg-primary/15 font-bold hover:bg-primary/20',
                )}
              >
                <TableCell className="text-center font-bold tabular-nums">
                  <span className="inline-flex items-center justify-center gap-1">
                    {rank <= 3 && (
                      <Trophy
                        className={cn(
                          'size-4',
                          rank === 1 && 'text-accent',
                          rank === 2 && 'text-muted-foreground',
                          rank === 3 && 'text-chart-5',
                        )}
                      />
                    )}
                    {rank}
                  </span>
                </TableCell>
                <TableCell className={cn('font-medium', isMe && 'font-bold')}>
                  <span className="inline-flex items-center gap-2">
                    {row.name}
                    {isMe && (
                      <Badge className="bg-primary px-1.5 py-0 text-[10px] font-bold text-primary-foreground">
                        Tu
                      </Badge>
                    )}
                  </span>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-center font-heading text-base font-bold',
                    isMe && 'text-primary',
                  )}
                >
                  {row.points}
                </TableCell>
                <TableCell className="hidden text-center tabular-nums sm:table-cell">
                  {row.exact}
                </TableCell>
                <TableCell className="hidden text-center tabular-nums sm:table-cell">
                  {row.correct1x2}
                </TableCell>
                <TableCell className="hidden text-center tabular-nums text-muted-foreground md:table-cell">
                  {row.played}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
