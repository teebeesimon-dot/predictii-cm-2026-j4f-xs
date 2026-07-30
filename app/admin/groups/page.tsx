'use client'

import { useMemo, useState } from 'react'
import { AppShell } from '@/components/app-shell'
import { useEdition } from '@/components/edition-provider'
import { useGroups, useUsers } from '@/lib/hooks'
import {
  createGroup,
  deleteGroup,
  updateGroup,
} from '@/lib/data'
import {
  hasEditionAccess,
  isDedicatedAdmin,
  isViewOnly,
  type Group,
  type AppUser,
} from '@/lib/types'
import { EmojiPickerField } from '@/components/groups/emoji-picker-field'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function AdminGroupsPage() {
  return (
    <AppShell requireAdmin>
      <AdminGroupsContent />
    </AppShell>
  )
}

function AdminGroupsContent() {
  const { edition, editionId } = useEdition()
  const { data: groups, isLoading: loadingGroups, mutate } = useGroups()
  const { data: users, isLoading: loadingUsers } = useUsers()

  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🏆')
  const [members, setMembers] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const eligibleUsers = useMemo(() => {
    if (!users) return []
    return users
      .filter((u) => !isDedicatedAdmin(u) && !isViewOnly(u))
      .filter((u) => hasEditionAccess(u, editionId))
      .sort((a, b) =>
        (a.name || a.username).localeCompare(b.name || b.username, 'ro'),
      )
  }, [users, editionId])

  const editing = editingId
    ? groups?.find((g) => g.id === editingId) ?? null
    : null

  function resetForm() {
    setEditingId(null)
    setName('')
    setEmoji('🏆')
    setMembers([])
  }

  function startCreate() {
    resetForm()
  }

  function startEdit(group: Group) {
    setEditingId(group.id)
    setName(group.name)
    setEmoji(group.emoji || '🏆')
    setMembers([...group.members])
  }

  function toggleMember(userId: string, checked: boolean) {
    setMembers((prev) =>
      checked
        ? [...new Set([...prev, userId])]
        : prev.filter((id) => id !== userId),
    )
  }

  async function handleSave() {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error('Introdu un nume pentru grupă.')
      return
    }
    if (!emoji.trim()) {
      toast.error('Alege un emoji pentru grupă.')
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        await updateGroup(editingId, {
          name: trimmed,
          emoji,
          members,
        })
        toast.success('Grupa a fost actualizată.')
      } else {
        await createGroup({
          editionId,
          name: trimmed,
          emoji,
          members,
        })
        toast.success('Grupa a fost creată.')
      }
      await mutate()
      resetForm()
    } catch (err) {
      console.error(err)
      toast.error('Nu am putut salva grupa.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(group: Group) {
    if (
      !window.confirm(
        `Ștergi grupa „${group.emoji} ${group.name}"? Acțiunea nu poate fi anulată.`,
      )
    ) {
      return
    }
    try {
      await deleteGroup(group.id)
      toast.success('Grupa a fost ștearsă.')
      if (editingId === group.id) resetForm()
      await mutate()
    } catch (err) {
      console.error(err)
      toast.error('Nu am putut șterge grupa.')
    }
  }

  const loading = loadingGroups || loadingUsers

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold">Grupe</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Creează și gestionează grupele de participanți pentru competiția
            selectată. Un jucător poate face parte din mai multe grupe.
          </p>
          <p className="mt-2 inline-flex items-center gap-2 rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
            Editezi:{' '}
            <span className="font-bold text-foreground">{edition.label}</span>
          </p>
        </div>
        <Button type="button" variant="outline" onClick={startCreate}>
          <PlusCircle className="size-4" />
          Grupă nouă
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UsersRound className="size-4" />
              Grupele ediției
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loading ? (
              <Skeleton className="h-40 w-full" />
            ) : !groups || groups.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                Nicio grupă încă. Creează prima grupă din formularul alăturat.
              </p>
            ) : (
              groups.map((group) => {
                const active = editingId === group.id
                return (
                  <div
                    key={group.id}
                    className={cn(
                      'flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between',
                      active && 'ring-2 ring-primary/40',
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl leading-none">
                          {group.emoji}
                        </span>
                        <h3 className="truncate font-heading text-lg font-bold">
                          {group.name}
                        </h3>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {group.members.length}{' '}
                        {group.members.length === 1 ? 'membru' : 'membri'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {group.members.slice(0, 8).map((userId) => {
                          const u = users?.find((x) => x.id === userId)
                          return (
                            <Badge
                              key={userId}
                              variant="secondary"
                              className="max-w-[10rem] truncate text-[10px]"
                            >
                              {u?.name || u?.username || userId}
                            </Badge>
                          )
                        })}
                        {group.members.length > 8 && (
                          <Badge variant="outline" className="text-[10px]">
                            +{group.members.length - 8}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => startEdit(group)}
                      >
                        <Pencil className="size-3.5" />
                        Editează
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(group)}
                      >
                        <Trash2 className="size-3.5" />
                        Șterge
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">
                {editing ? 'Editează grupa' : 'Grupă nouă'}
              </CardTitle>
              {editing && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetForm}
                >
                  <X className="size-3.5" />
                  Anulează
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="group-name">Nume</Label>
              <Input
                id="group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Campioni"
                maxLength={60}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Emoji</Label>
              <div className="flex items-center gap-3">
                <EmojiPickerField value={emoji} onChange={setEmoji} />
                <p className="text-xs text-muted-foreground">
                  Alege din catalogul complet (căutare + categorii). Se salvează
                  doar caracterul emoji.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Label>Membri</Label>
              {loadingUsers ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border">
                  {eligibleUsers.length === 0 ? (
                    <p className="p-4 text-sm text-muted-foreground">
                      Niciun participant eligibil pentru această ediție.
                    </p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {eligibleUsers.map((u) => (
                        <MemberCheckboxRow
                          key={u.id}
                          user={u}
                          checked={members.includes(u.id)}
                          onChange={(checked) => toggleMember(u.id, checked)}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Selectați: {members.length}
              </p>
            </div>

            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {editing ? 'Salvează modificările' : 'Creează grupa'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MemberCheckboxRow({
  user,
  checked,
  onChange,
}: {
  user: AppUser
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const id = `member-${user.id}`
  return (
    <li>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm hover:bg-secondary/50"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="size-4 shrink-0 rounded border-border accent-primary"
        />
        <span className="min-w-0 truncate font-medium">
          {user.name || user.username}
        </span>
        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
          @{user.username}
        </span>
      </label>
    </li>
  )
}
