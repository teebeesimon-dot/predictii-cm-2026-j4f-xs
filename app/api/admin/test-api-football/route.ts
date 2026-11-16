import { NextRequest, NextResponse } from 'next/server'
import { adminDeniedResponse, authorizeAdminRequest } from '@/lib/admin-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ApiResponse<T> = {
  errors?: unknown
  results?: number
  response?: T[]
}

async function apiGet<T>(url: URL, key: string): Promise<{
  ok: boolean
  status: number
  results: number
  response: T[]
  errors: unknown
}> {
  const res = await fetch(url, {
    headers: { 'x-apisports-key': key },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
  })
  const body = (await res.json().catch(() => ({}))) as ApiResponse<T>
  return {
    ok: res.ok && (!body.errors || (Array.isArray(body.errors) && body.errors.length === 0)),
    status: res.status,
    results: body.results ?? 0,
    response: body.response ?? [],
    errors: body.errors ?? null,
  }
}

export async function GET(req: NextRequest) {
  const auth = await authorizeAdminRequest(req)
  if (!auth.ok) return adminDeniedResponse(auth)

  const key = process.env.API_FOOTBALL_KEY
  if (!key) {
    return NextResponse.json(
      { ok: false, error: 'Lipsește API_FOOTBALL_KEY din environment-ul acestui deployment.' },
      { status: 503 },
    )
  }

  const base = 'https://v3.football.api-sports.io'
  try {
    // Verificam explicit competitiile si sezoanele necesare. Acest endpoint
    // este read-only: nu citeste si nu scrie nimic in Firestore.
    const [clLeague, wcLeague] = await Promise.all([
      apiGet<{ league: { id: number; name: string }; country: { name: string }; seasons: { year: number; coverage?: { fixtures?: { live?: boolean; events?: boolean } } }[] }>(
        new URL(`${base}/leagues?id=2&season=2026`), key,
      ),
      apiGet<{ league: { id: number; name: string }; country: { name: string }; seasons: { year: number; coverage?: { fixtures?: { live?: boolean; events?: boolean } } }[] }>(
        new URL(`${base}/leagues?id=1&season=2026`), key,
      ),
    ])

    const [clFixtures, wcFixtures] = await Promise.all([
      apiGet<{ fixture: { id: number; date: string; status: { short: string; long: string } }; teams: { home: { name: string }; away: { name: string } }; goals: { home: number | null; away: number | null } }>(
        new URL(`${base}/fixtures?league=2&season=2026`), key,
      ),
      apiGet<{ fixture: { id: number; date: string; status: { short: string; long: string } }; teams: { home: { name: string }; away: { name: string } }; goals: { home: number | null; away: number | null } }>(
        new URL(`${base}/fixtures?league=1&season=2026`), key,
      ),
    ])

    const summarizeLeague = (result: typeof clLeague) => ({
      ok: result.ok,
      httpStatus: result.status,
      results: result.results,
      errors: result.errors,
      competitions: result.response.map((item) => ({
        id: item.league.id,
        name: item.league.name,
        country: item.country.name,
        seasons: item.seasons.map((season) => ({
          year: season.year,
          liveCoverage: season.coverage?.fixtures?.live ?? null,
          eventsCoverage: season.coverage?.fixtures?.events ?? null,
        })),
      })),
    })

    const summarizeFixtures = (result: typeof clFixtures) => ({
      ok: result.ok,
      httpStatus: result.status,
      results: result.results,
      errors: result.errors,
      sample: result.response.slice(0, 5).map((item) => ({
        date: item.fixture.date,
        home: item.teams.home.name,
        away: item.teams.away.name,
        status: item.fixture.status.short,
        homeGoals: item.goals.home,
        awayGoals: item.goals.away,
      })),
    })

    return NextResponse.json({
      ok: clLeague.ok && wcLeague.ok && clFixtures.ok && wcFixtures.ok,
      provider: 'API-Football',
      plan: 'Free',
      dailyLimit: 100,
      requestsUsedByThisTest: 4,
      firestoreAccess: 'none',
      championsLeague: {
        league: summarizeLeague(clLeague),
        fixtures: summarizeFixtures(clFixtures),
      },
      worldCup: {
        league: summarizeLeague(wcLeague),
        fixtures: summarizeFixtures(wcFixtures),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Eroare necunoscuta.'
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
