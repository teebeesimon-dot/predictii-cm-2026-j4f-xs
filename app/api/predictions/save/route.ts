import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { rebuildUserLeaderboardSummary } from '@/lib/server/leaderboard-aggregates'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearerToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || ''
  const match = /^Bearer\s+(.+)$/i.exec(header)
  return match?.[1]?.trim() || null
}

export async function POST(req: NextRequest) {
  const token = bearerToken(req)
  if (!token) {
    return NextResponse.json({ error: 'Autentificare necesara.' }, { status: 401 })
  }

  let uid: string
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid
  } catch {
    return NextResponse.json({ error: 'Sesiune invalida sau expirata.' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as {
    matchId?: string
    homeScore?: number
    awayScore?: number
  }
  const matchId = body.matchId?.trim()
  const homeScore = body.homeScore
  const awayScore = body.awayScore
  if (!matchId || !Number.isInteger(homeScore) || !Number.isInteger(awayScore) ||
      (homeScore as number) < 0 || (awayScore as number) < 0) {
    return NextResponse.json({ error: 'Datele pronosticului sunt invalide.' }, { status: 400 })
  }

  try {
    const db = adminDb()
    const profiles = await db.collection('users')
      .where('authUid', '==', uid).limit(2).get()
    if (profiles.size !== 1) {
      return NextResponse.json({ error: 'Contul nu este asociat unui profil SKUPA unic.' }, { status: 403 })
    }

    const profile = profiles.docs[0]
    const user = profile.data()
    if (user.viewOnly === true) {
      return NextResponse.json({ error: 'Contul de supraveghere nu poate trimite pronosticuri.' }, { status: 403 })
    }

    const matchSnap = await db.collection('matches').doc(matchId).get()
    if (!matchSnap.exists) {
      return NextResponse.json({ error: 'Meciul nu exista.' }, { status: 404 })
    }
    const match = matchSnap.data()!
    const editionId = typeof match.editionId === 'string' ? match.editionId : 'wc-2026'
    const isAdmin = user.isAdmin === true || user.role === 'admin'
    const hasAccess = isAdmin || (editionId === 'wc-2026'
      ? user.access?.[editionId] !== false
      : user.access?.[editionId] === true)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Nu ai acces la aceasta competitie.' }, { status: 403 })
    }

    const kickoffMs = new Date(String(match.kickoff || '')).getTime()
    if (!Number.isFinite(kickoffMs) || kickoffMs <= Date.now()) {
      return NextResponse.json({ error: 'Meciul a inceput deja. Pronosticul este blocat.' }, { status: 409 })
    }

    const predictionId = `${profile.id}_${matchId}`
    await db.collection('predictions').doc(predictionId).set({
      userId: profile.id,
      matchId,
      editionId,
      homeScore,
      awayScore,
      updatedAt: Date.now(),
    })
    let summaryUpdated = true
    try { await rebuildUserLeaderboardSummary(profile.id, editionId) }
    catch (error) { summaryUpdated = false; console.error('[predictions/save] summary rebuild failed', error) }

    return NextResponse.json({ ok: true, predictionId, editionId, summaryUpdated })

  } catch (error) {
    console.error('[predictions/save] failed', error)
    return NextResponse.json({ error: 'Eroare la salvarea pronosticului.' }, { status: 500 })
  }
}
