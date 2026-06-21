// Integrare GRATUITĂ cu football-data.org pentru rezultatele CM 2026.
//
// Plan gratuit ("Free Tier, forever"): competiția FIFA World Cup (cod 2000).
// Limită: 10 cereri/minut. Noi facem 1 cerere per sincronizare (luăm toate
// meciurile odată), deci suntem mult sub limită.
//
// IMPORTANT: API-ul returnează numele echipelor în ENGLEZĂ, dar orarul nostru
// (lib/wc2026-schedule.ts) le are în ROMÂNĂ. De aceea normalizăm și mapăm
// numele englezești (cu variante posibile) la numele românești canonice.

import type { Match } from '@/lib/types'

export const WORLD_CUP_COMPETITION = 2000
const API_BASE = 'https://api.football-data.org/v4'

// Statusuri returnate de API.
export type ApiMatchStatus =
  | 'SCHEDULED'
  | 'TIMED'
  | 'IN_PLAY'
  | 'PAUSED'
  | 'EXTRA_TIME'
  | 'PENALTY_SHOOTOUT'
  | 'FINISHED'
  | 'SUSPENDED'
  | 'POSTPONED'
  | 'CANCELLED'
  | 'AWARDED'

interface ApiTeam {
  name?: string | null
  shortName?: string | null
  tla?: string | null
}

interface ApiMatch {
  id: number
  status: ApiMatchStatus
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: {
    // Pentru fazele eliminatorii API-ul include și extraTime/penalties, dar
    // pentru pronosticuri ne interesează rezultatul „regulamentar" afișat în
    // fullTime (care la grupe este scorul final).
    fullTime: { home: number | null; away: number | null }
    regularTime?: { home: number | null; away: number | null }
  }
}

interface ApiMatchesResponse {
  matches: ApiMatch[]
}

// Normalizează un nume de echipă pentru comparație: minuscule, fără diacritice,
// fără punctuație, spații colapsate.
function normalize(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // elimină diacriticele
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Mapare: variante englezești (normalizate) -> nume canonic ROMÂNESC din orar.
// Includem mai multe aliasuri pentru aceeași echipă, fiindcă football-data
// poate folosi forme diferite (ex. "Czech Republic" sau "Czechia").
const EN_TO_RO: Record<string, string> = {}
function alias(roName: string, ...enVariants: string[]) {
  for (const v of enVariants) EN_TO_RO[normalize(v)] = roName
}

alias('Mexic', 'Mexico')
alias('Africa de Sud', 'South Africa')
alias('Coreea de Sud', 'South Korea', 'Korea Republic', 'Republic of Korea')
alias('Cehia', 'Czechia', 'Czech Republic')
alias('Canada', 'Canada')
alias('Bosnia și Herțegovina', 'Bosnia and Herzegovina', 'Bosnia-Herzegovina', 'Bosnia Herzegovina')
alias('Qatar', 'Qatar')
alias('Elveția', 'Switzerland')
alias('Brazilia', 'Brazil')
alias('Maroc', 'Morocco')
alias('Haiti', 'Haiti')
alias('Scoția', 'Scotland')
alias('SUA', 'United States', 'USA', 'United States of America')
alias('Paraguay', 'Paraguay')
alias('Australia', 'Australia')
alias('Turcia', 'Turkey', 'Türkiye', 'Turkiye')
alias('Germania', 'Germany')
alias('Curaçao', 'Curacao', 'Curaçao')
alias('Coasta de Fildeș', 'Ivory Coast', "Cote d'Ivoire", 'Côte d’Ivoire', 'Cote dIvoire')
alias('Ecuador', 'Ecuador')
alias('Olanda', 'Netherlands', 'Holland')
alias('Japonia', 'Japan')
alias('Suedia', 'Sweden')
alias('Tunisia', 'Tunisia')
alias('Belgia', 'Belgium')
alias('Egipt', 'Egypt')
alias('Iran', 'Iran', 'IR Iran')
alias('Noua Zeelandă', 'New Zealand')
alias('Spania', 'Spain')
alias('Capul Verde', 'Cape Verde', 'Cape Verde Islands', 'Cabo Verde')
alias('Arabia Saudită', 'Saudi Arabia')
alias('Uruguay', 'Uruguay')
alias('Franța', 'France')
alias('Senegal', 'Senegal')
alias('Irak', 'Iraq')
alias('Norvegia', 'Norway')
alias('Argentina', 'Argentina')
alias('Algeria', 'Algeria')
alias('Austria', 'Austria')
alias('Iordania', 'Jordan')
alias('Portugalia', 'Portugal')
alias('RD Congo', 'DR Congo', 'Congo DR', 'Democratic Republic of Congo', 'Congo (DR)')
alias('Uzbekistan', 'Uzbekistan')
alias('Columbia', 'Colombia')
alias('Anglia', 'England')
alias('Croația', 'Croatia')
alias('Ghana', 'Ghana')
alias('Panama', 'Panama')

// Transformă un nume de echipă din API (engleză) în numele românesc canonic.
// Întoarce null dacă nu găsim o potrivire.
export function mapApiTeamToRo(team: ApiTeam): string | null {
  const candidates = [team.name, team.shortName].filter(Boolean) as string[]
  for (const c of candidates) {
    const ro = EN_TO_RO[normalize(c)]
    if (ro) return ro
  }
  return null
}

// Considerăm un meci „terminat" (rezultat oficial) pentru aceste statusuri.
export function isFinalStatus(status: ApiMatchStatus): boolean {
  return status === 'FINISHED' || status === 'AWARDED'
}

// Considerăm scorul „în desfășurare" (live) pentru aceste statusuri.
export function isLiveStatus(status: ApiMatchStatus): boolean {
  return (
    status === 'IN_PLAY' ||
    status === 'PAUSED' ||
    status === 'EXTRA_TIME' ||
    status === 'PENALTY_SHOOTOUT'
  )
}

export interface NormalizedApiMatch {
  status: ApiMatchStatus
  roHome: string | null
  roAway: string | null
  homeScore: number | null
  awayScore: number | null
  rawHome: string
  rawAway: string
}

// Cheie neordonată pentru o pereche de echipe (ca scorul să nimerească meciul
// chiar dacă API-ul inversează gazdă/oaspete față de orarul nostru).
export function teamPairKey(a: string, b: string): string {
  return [normalize(a), normalize(b)].sort().join('::')
}

// Preia toate meciurile CM 2026 de la football-data.org și le normalizează.
// Aruncă eroare dacă lipsește token-ul sau API-ul răspunde cu eroare.
export async function fetchWorldCupMatches(token: string): Promise<NormalizedApiMatch[]> {
  const res = await fetch(`${API_BASE}/competitions/${WORLD_CUP_COMPETITION}/matches`, {
    headers: { 'X-Auth-Token': token },
    // Nu cache-uim: vrem mereu cele mai noi scoruri.
    cache: 'no-store',
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`football-data.org a răspuns ${res.status}: ${body.slice(0, 200)}`)
  }

  const data = (await res.json()) as ApiMatchesResponse
  const matches = data.matches ?? []

  return matches.map((m) => {
    const home = m.score.fullTime.home
    const away = m.score.fullTime.away
    return {
      status: m.status,
      roHome: mapApiTeamToRo(m.homeTeam),
      roAway: mapApiTeamToRo(m.awayTeam),
      homeScore: home,
      awayScore: away,
      rawHome: m.homeTeam.name ?? m.homeTeam.shortName ?? '?',
      rawAway: m.awayTeam.name ?? m.awayTeam.shortName ?? '?',
    }
  })
}

// ---------------------------------------------------------------------------
// Import generic de meciuri pentru orice competiție (ediții noi).
// Spre deosebire de sincronizarea CM 2026 (care mapează la nume românești), aici
// folosim numele brute din API (de regulă în engleză), fiindcă nu avem un orar
// local pentru alte competiții. Meciurile importate primesc stage=1 implicit;
// blocarea se face per-meci după kickoff.
// ---------------------------------------------------------------------------

export interface ImportableMatch {
  homeTeam: string
  awayTeam: string
  kickoff: string // ISO
  homeScore: number | null
  awayScore: number | null
  matchday: number | null
}

interface ApiMatchFull extends ApiMatch {
  utcDate?: string
  matchday?: number | null
}

// Preia toate meciurile unei competiții după cod și le pregătește pentru import.
// Aruncă eroare dacă lipsește token-ul sau API-ul răspunde cu eroare (inclusiv
// 403/404 când competiția nu e disponibilă pe planul gratuit).
export async function fetchCompetitionMatches(
  token: string,
  competitionCode: number,
): Promise<ImportableMatch[]> {
  const res = await fetch(
    `${API_BASE}/competitions/${competitionCode}/matches`,
    {
      headers: { 'X-Auth-Token': token },
      cache: 'no-store',
    },
  )

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(
      `football-data.org a răspuns ${res.status}: ${body.slice(0, 200)}`,
    )
  }

  const data = (await res.json()) as { matches?: ApiMatchFull[] }
  const matches = data.matches ?? []

  return matches
    .filter((m) => m.homeTeam?.name && m.awayTeam?.name && m.utcDate)
    .map((m) => ({
      homeTeam: m.homeTeam.name as string,
      awayTeam: m.awayTeam.name as string,
      kickoff: new Date(m.utcDate as string).toISOString(),
      homeScore: m.score?.fullTime?.home ?? null,
      awayScore: m.score?.fullTime?.away ?? null,
      matchday: m.matchday ?? null,
    }))
}

// Rezultatul calculării diferențelor între API și Firestore.
export interface ScoreUpdate {
  matchId: string
  homeTeam: string
  awayTeam: string
  fromHome: number | null
  fromAway: number | null
  toHome: number
  toAway: number
  status: ApiMatchStatus
}

// Compară meciurile din Firestore cu cele din API și întoarce DOAR meciurile
// la care scorul s-a schimbat. Implicit actualizăm doar meciurile cu status
// final (FINISHED/AWARDED); dacă includeLive=true, actualizăm și scorurile live.
export function diffScores(
  firestoreMatches: Match[],
  apiMatches: NormalizedApiMatch[],
  options: { includeLive?: boolean } = {},
): ScoreUpdate[] {
  const includeLive = options.includeLive === true

  // Index API după perechea de echipe (neordonată).
  const apiByPair = new Map<string, NormalizedApiMatch>()
  for (const a of apiMatches) {
    if (!a.roHome || !a.roAway) continue
    apiByPair.set(teamPairKey(a.roHome, a.roAway), a)
  }

  const updates: ScoreUpdate[] = []
  for (const m of firestoreMatches) {
    // Scor corectat manual de admin: nu îl atingem (furnizorul poate greși).
    if (m.scoreOverride === true) continue

    const api = apiByPair.get(teamPairKey(m.homeTeam, m.awayTeam))
    if (!api) continue

    const usable = isFinalStatus(api.status) || (includeLive && isLiveStatus(api.status))
    if (!usable) continue
    if (api.homeScore === null || api.awayScore === null) continue

    // Aliniază scorurile la orientarea gazdă/oaspete din orarul nostru.
    let toHome = api.homeScore
    let toAway = api.awayScore
    const sameOrientation = normalize(m.homeTeam) === normalize(api.roHome as string)
    if (!sameOrientation) {
      toHome = api.awayScore
      toAway = api.homeScore
    }

    if (m.homeScore === toHome && m.awayScore === toAway) continue

    updates.push({
      matchId: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      fromHome: m.homeScore,
      fromAway: m.awayScore,
      toHome,
      toAway,
      status: api.status,
    })
  }

  return updates
}
