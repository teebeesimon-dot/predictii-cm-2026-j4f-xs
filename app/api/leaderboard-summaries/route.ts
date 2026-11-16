import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearerToken(req: NextRequest): string | null {
  const match = /^Bearer\\s+(.+)$/i.exec(req.headers.get('authorization') || '')
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

    const snapshot = await db.collection('leaderboard_summaries').where('editionId', '==', editionId).get()
    const summaries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    return NextResponse.json({ editionId, summaries })
  } catch (error) {
    console.error('[leaderboard-summaries] read failed', error)
    return NextResponse.json({ error: 'Nu am putut incarca statisticile clasamentului.' }, { status: 401 })
  }
}
