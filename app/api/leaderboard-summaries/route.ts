import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearerToken(req: NextRequest): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.get('authorization') || '')
  return match?.[1]?.trim() || null
}

export async function GET(req: NextRequest) {
  const token = bearerToken(req)
  if (!token) return NextResponse.json({ error: 'Autentificare necesara.' }, { status: 401 })

  try {
    const decoded = await adminAuth().verifyIdToken(token)
    const db = adminDb()
    const profiles = await db.collection('users').where('authUid', '==', decoded.uid).limit(2).get()
    if (profiles.size !== 1) {
      return NextResponse.json({ error: 'Contul nu este asociat unui profil SKUPA unic.' }, { status: 403 })
    }

    const editionId = req.nextUrl.searchParams.get('editionId') || 'wc-2026'
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(editionId)) {
      return NextResponse.json({ error: 'Ediție invalida.' }, { status: 400 })
    }

    const viewerDoc = profiles.docs[0]
    const viewer = viewerDoc.data()
    const isAdmin = viewer.isAdmin === true || viewer.role === 'admin'
    const [usersSnapshot, groupsSnapshot, summariesSnapshot] = await Promise.all([
      db.collection('users').get(),
      db.collection('groups').where('editionId', '==', editionId).get(),
      db.collection('leaderboard_summaries').where('editionId', '==', editionId).get(),
    ])
    const groupMemberIds = new Set<string>()
    for (const group of groupsSnapshot.docs) {
      for (const memberId of (group.data().members ?? []) as string[]) groupMemberIds.add(memberId)
    }
    const viewerInGroup = groupMemberIds.has(viewerDoc.id)
    const usersById = new Map(usersSnapshot.docs.map((doc) => [doc.id, doc.data()]))
    const summaries = summariesSnapshot.docs.flatMap((summaryDoc) => {
      const userId = String(summaryDoc.data().userId ?? '')
      const participant = usersById.get(userId)
      if (!participant || participant.viewOnly === true || participant.username === 'admin' || String(participant.name ?? '').toLowerCase() === 'administrator') return []
      const participantAdmin = participant.isAdmin === true || participant.role === 'admin'
      const hasAccess = participantAdmin || (editionId === 'wc-2026'
        ? participant.access?.[editionId] !== false
        : participant.access?.[editionId] === true)
      if (!hasAccess) return []
      if (!isAdmin && (!viewerInGroup || !groupMemberIds.has(userId))) return []
      if (!isAdmin && participant.hideFromStandings === true && userId !== viewerDoc.id) return []
      return [{ id: summaryDoc.id, ...summaryDoc.data() }]
    })
    return NextResponse.json({ editionId, summaries })
  } catch (error) {
    console.error('[leaderboard-summaries] read failed', error)
    return NextResponse.json({ error: 'Nu am putut incarca statisticile clasamentului.' }, { status: 401 })
  }
}
