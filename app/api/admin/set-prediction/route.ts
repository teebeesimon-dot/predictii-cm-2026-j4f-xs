import { type NextRequest, NextResponse } from 'next/server'
import { authorizeAdminRequest } from '@/lib/admin-auth'
import { adminDb } from '@/lib/firebase-admin'

// Endpoint de administrare pentru a seta/corecta pronosticul unui utilizator
// la un meci care ÎNCĂ NU a început. Replică exact logica din
// lib/data.ts `savePrediction` (id determinist `{userId}_{matchId}`, aceleași
// câmpuri, guard pe kickoff), dar server-side cu Admin SDK.
//
// Body (JSON):
//   {
//     "userQuery": "Danu Claudiu",  // caută după name/username (case-insensitive)
//     "homeTeam": "Franța",          // caută meciul după echipe (case-insensitive, parțial)
//     "awayTeam": "Spania",
//     "homeScore": 2,
//     "awayScore": 1,
//     "actorId": "..."               // adminul care execută (verificat din Firestore)
//   }
// Se poate autoriza și server-to-server cu header x-push-secret / Bearer CRON_SECRET.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function norm(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // scoate diacriticele
    .trim()
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    userQuery?: string
    homeTeam?: string
    awayTeam?: string
    homeScore?: number
    awayScore?: number
    actorId?: string
  }

  let auth
  try {
    auth = await authorizeAdminRequest(req, body.actorId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.reason ?? 'Neautorizat' },
      { status: 401 },
    )
  }

  const userQuery = norm(body.userQuery)
  const homeQuery = norm(body.homeTeam)
  const awayQuery = norm(body.awayTeam)
  const homeScore = Number(body.homeScore)
  const awayScore = Number(body.awayScore)

  if (!userQuery || !homeQuery || !awayQuery) {
    return NextResponse.json(
      { error: 'userQuery, homeTeam și awayTeam sunt obligatorii.' },
      { status: 400 },
    )
  }
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
    return NextResponse.json(
      { error: 'Scorurile trebuie să fie numere întregi ≥ 0.' },
      { status: 400 },
    )
  }

  const db = adminDb()

  // 1) Găsește utilizatorul după name sau username.
  const usersSnap = await db.collection('users').get()
  const userMatches = usersSnap.docs.filter((d) => {
    const x = d.data()
    return norm(x.name).includes(userQuery) || norm(x.username).includes(userQuery)
  })
  if (userMatches.length === 0) {
    return NextResponse.json({ error: `Niciun utilizator pentru „${body.userQuery}”.` }, { status: 404 })
  }
  if (userMatches.length > 1) {
    return NextResponse.json(
      {
        error: `Mai mulți utilizatori pentru „${body.userQuery}”: ${userMatches
          .map((d) => d.data().name || d.data().username)
          .join(', ')}. Fii mai specific.`,
      },
      { status: 409 },
    )
  }
  const userDoc = userMatches[0]
  const userId = userDoc.id

  // 2) Găsește meciul după echipe (ambele sensuri, ca să nu conteze ordinea).
  const matchesSnap = await db.collection('matches').get()
  const matchMatches = matchesSnap.docs.filter((d) => {
    const x = d.data()
    const h = norm(x.homeTeam)
    const a = norm(x.awayTeam)
    return (
      (h.includes(homeQuery) && a.includes(awayQuery)) ||
      (h.includes(awayQuery) && a.includes(homeQuery))
    )
  })
  if (matchMatches.length === 0) {
    return NextResponse.json(
      { error: `Niciun meci pentru „${body.homeTeam} - ${body.awayTeam}”.` },
      { status: 404 },
    )
  }
  if (matchMatches.length > 1) {
    return NextResponse.json(
      {
        error: `Mai multe meciuri potrivite (${matchMatches.length}). Restrânge căutarea.`,
        matches: matchMatches.map((d) => ({
          id: d.id,
          home: d.data().homeTeam,
          away: d.data().awayTeam,
          kickoff: d.data().kickoff,
        })),
      },
      { status: 409 },
    )
  }
  const matchDoc = matchMatches[0]
  const matchId = matchDoc.id
  const match = matchDoc.data()

  // 3) Guard: meciul nu trebuie să fi început.
  const kickoffMs = new Date(match.kickoff).getTime()
  if (Number.isFinite(kickoffMs) && kickoffMs <= Date.now()) {
    return NextResponse.json(
      { error: 'Meciul a început deja — pronosticul este blocat.' },
      { status: 409 },
    )
  }

  // 4) Determină editionId exact ca `editionOf` din lib/data.ts: câmpul de pe
  //    meci, cu fallback la ediția World Cup 2026 (DEFAULT_EDITION_ID) pentru
  //    documentele vechi fără editionId.
  const editionId = match.editionId || 'wc-2026'

  // 5) Scrie pronosticul (același id determinist ca savePrediction).
  const id = `${userId}_${matchId}`
  await db.collection('predictions').doc(id).set({
    userId,
    matchId,
    editionId,
    homeScore,
    awayScore,
    updatedAt: Date.now(),
  })

  const userLabel = userDoc.data().name || userDoc.data().username || userId
  console.log(
    `[v0] set-prediction: ${auth.actorName} a setat ${userLabel} — ${match.homeTeam} ${homeScore}-${awayScore} ${match.awayTeam} (${matchId})`,
  )

  return NextResponse.json({
    success: true,
    user: userLabel,
    match: `${match.homeTeam} - ${match.awayTeam}`,
    score: `${homeScore}-${awayScore}`,
    predictionId: id,
    editionId,
  })
}
