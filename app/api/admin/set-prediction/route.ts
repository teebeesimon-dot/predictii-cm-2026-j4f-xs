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
    userId?: string
    matchId?: string
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
  const directIds = Boolean(body.userId && body.matchId)

  if (!directIds && (!userQuery || !homeQuery || !awayQuery)) {
    return NextResponse.json(
      {
        error:
          'Trimite fie (userId + matchId), fie (userQuery + homeTeam + awayTeam).',
      },
      { status: 400 },
    )
  }
  if (!Number.isInteger(homeScore) || !Number.isInteger(awayScore) || homeScore < 0 || awayScore < 0) {
    return NextResponse.json(
      { error: 'Scorurile trebuie să fie numere întregi ≥ 0.' },
      { status: 400 },
    )
  }

  try {
  const db = adminDb()

  // 1) Determină documentul utilizatorului.
  //    Cu userId → o singură citire (ieftin, sigur chiar și cu cota aproape
  //    epuizată). Fără → fallback: scanează colecția users (mai scump).
  let userDoc
  if (body.userId) {
    const snap = await db.collection('users').doc(body.userId).get()
    if (!snap.exists) {
      return NextResponse.json({ error: `userId inexistent: ${body.userId}` }, { status: 404 })
    }
    userDoc = snap
  } else {
    // Cazul comun (nume/username complet) folosește query-uri selective. Doar
    // căutările parțiale/insensibile la diacritice cad pe scanarea legacy.
    const rawUserQuery = String(body.userQuery ?? '').trim()
    const [byName, byUsername] = await Promise.all([
      db.collection('users').where('name', '==', rawUserQuery).limit(2).get(),
      db
        .collection('users')
        .where('username', '==', rawUserQuery.toLowerCase())
        .limit(2)
        .get(),
    ])
    const exact = new Map(
      [...byName.docs, ...byUsername.docs].map((d) => [d.id, d]),
    )
    const userMatches =
      exact.size > 0
        ? Array.from(exact.values())
        : (await db.collection('users').get()).docs.filter((d) => {
            const x = d.data()
            return (
              norm(x.name).includes(userQuery) ||
              norm(x.username).includes(userQuery)
            )
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
    userDoc = userMatches[0]
  }
  const userId = userDoc.id

  // 2) Determină documentul meciului (analog: matchId → o singură citire).
  let matchDoc
  if (body.matchId) {
    const snap = await db.collection('matches').doc(body.matchId).get()
    if (!snap.exists) {
      return NextResponse.json({ error: `matchId inexistent: ${body.matchId}` }, { status: 404 })
    }
    matchDoc = snap
  } else {
    const rawHome = String(body.homeTeam ?? '').trim()
    const rawAway = String(body.awayTeam ?? '').trim()
    // Query după gazdă restrânge drastic candidații fără index compus; filtrăm
    // oaspetele local. Verificăm și ordinea inversă, apoi păstrăm fallback-ul
    // global numai pentru căutări parțiale/diacritice diferite.
    const [homeFirst, awayFirst] = await Promise.all([
      db.collection('matches').where('homeTeam', '==', rawHome).get(),
      db.collection('matches').where('homeTeam', '==', rawAway).get(),
    ])
    const exactCandidates = [...homeFirst.docs, ...awayFirst.docs]
    const exactMatches = exactCandidates.filter((d) => {
      const x = d.data()
      return (
        (x.homeTeam === rawHome && x.awayTeam === rawAway) ||
        (x.homeTeam === rawAway && x.awayTeam === rawHome)
      )
    })
    const matchMatches =
      exactMatches.length > 0
        ? exactMatches
        : (await db.collection('matches').get()).docs.filter((d) => {
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
    matchDoc = matchMatches[0]
  }
  const matchId = matchDoc.id
  const match = matchDoc.data() as Record<string, unknown> & {
    homeTeam: string
    awayTeam: string
    kickoff: string
    editionId?: string
  }

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

  const userData = (userDoc.data() ?? {}) as {
    name?: string
    username?: string
  }
  const userLabel = userData.name || userData.username || userId
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
  } catch (e) {
    console.log('[v0] set-prediction ERROR:', (e as Error).message)
    return NextResponse.json(
      { error: 'Eroare internă', detail: (e as Error).message },
      { status: 500 },
    )
  }
}
