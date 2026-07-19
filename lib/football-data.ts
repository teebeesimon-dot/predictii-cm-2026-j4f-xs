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

interface ApiScoreLine {
  home: number | null
  away: number | null
}

interface ApiMatch {
  id: number
  status: ApiMatchStatus
  utcDate?: string
  homeTeam: ApiTeam
  awayTeam: ApiTeam
  score: {
    // `duration` = REGULAR | EXTRA_TIME | PENALTY_SHOOTOUT.
    duration?: string
    // `fullTime` include prelungirile (și penalty-urile) la meciurile
    // eliminatorii care nu s-au decis în 90 de minute.
    fullTime: ApiScoreLine
    // `regularTime` = scorul DOAR după 90 de minute (apare doar când meciul a
    // trecut în prelungiri). Acesta e scorul pe care îl folosim la pronosticuri.
    regularTime?: ApiScoreLine
  }
}

// Extrage scorul „regulamentar" (DOAR 90 de minute), conform regulilor ligii:
// nu se iau în calcul prelungirile sau loviturile de departajare. Când meciul a
// mers în prelungiri, folosim `regularTime`; altfel `fullTime` este deja scorul
// de la finalul celor 90 de minute (grupe + eliminatorii decise în timp regul.).
//
// ATENȚIE — caz special: API-ul poate marca meciul FINISHED cu duration=
// EXTRA_TIME/PENALTY_SHOOTOUT dar să nu populeze încă `regularTime` (latență
// API). În acel caz NU folosim `fullTime` (care ar conține golurile din ET) —
// returnăm null/null astfel încât `diffScores` să ignoreze meciul până sosesc
// datele corecte. La cron-ul următor, când API-ul populează `regularTime`,
// scorul corect va fi salvat automat.
export function extractRegulationScore(score: ApiMatch['score']): ApiScoreLine {
  const reg = score.regularTime
  if (reg && reg.home !== null && reg.home !== undefined && reg.away !== null && reg.away !== undefined) {
    return { home: reg.home, away: reg.away }
  }
  // Dacă meciul a trecut în prelungiri/penalty-uri dar regularTime nu e încă
  // disponibil, returnăm null — nu scriem scorul greșit în Firestore.
  const duration = score.duration
  if (duration === 'EXTRA_TIME' || duration === 'PENALTY_SHOOTOUT') {
    return { home: null, away: null }
  }
  return { home: score.fullTime.home, away: score.fullTime.away }
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
  kickoff: string // ISO; folosit pentru a distinge manșele tur-retur
}

// Cheie neordonată pentru o pereche de echipe (ca scorul să nimerească meciul
// chiar dacă API-ul inversează gazdă/oaspete față de orarul nostru).
export function teamPairKey(a: string, b: string): string {
  return [normalize(a), normalize(b)].sort().join('::')
}

// Preia toate meciurile unei competiții de la football-data.org și le
// normalizează. Aruncă eroare dacă lipsește token-ul sau API-ul răspunde cu
// eroare. `competitionCode` implicit = World Cup (compatibilitate).
export async function fetchWorldCupMatches(
  token: string,
  competitionCode: number = WORLD_CUP_COMPETITION,
): Promise<NormalizedApiMatch[]> {
  const res = await fetch(`${API_BASE}/competitions/${competitionCode}/matches`, {
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
    // Scorul de la 90 de minute (fără prelungiri/penalty-uri).
    const { home, away } = extractRegulationScore(m.score)
    return {
      status: m.status,
      roHome: mapApiTeamToRo(m.homeTeam),
      roAway: mapApiTeamToRo(m.awayTeam),
      homeScore: home,
      awayScore: away,
      rawHome: m.homeTeam.name ?? m.homeTeam.shortName ?? '?',
      rawAway: m.awayTeam.name ?? m.awayTeam.shortName ?? '?',
      kickoff: m.utcDate ? new Date(m.utcDate).toISOString() : '',
    }
  })
}

// ---------------------------------------------------------------------------
// Import al fazei eliminatorii a CM 2026 (ex. șaisprezecimi = Etapa 4).
// Spre deosebire de sincronizarea de scoruri, aici avem nevoie și de FAZA
// (stage) și de ORA meciului, ca să putem CREA meciurile care nu există încă în
// Firestore. Numele echipelor sunt mapate la forma românească (ca restul
// orarului), iar meciurile fără echipe stabilite încă (TBD la tragerea la sorți)
// sunt semnalate apelantului prin roHome/roAway = null.
// ---------------------------------------------------------------------------

export interface StagedApiMatch {
  apiStage: string // ex. GROUP_STAGE, LEAGUE_STAGE, LAST_32, PLAYOFFS...
  matchday: number | null // pentru fazele-ligă/grupe (CL: runda 1-8)
  kickoff: string // ISO (gol dacă lipsește data)
  roHome: string | null // numele mapat la RO (doar la echipe naționale)
  roAway: string | null
  rawHome: string | null // numele brut din API (cluburi la CL)
  rawAway: string | null
  homeScore: number | null
  awayScore: number | null
}

// Alias pentru compatibilitate cu importul fazei eliminatorii CM.
export type StagedWcMatch = StagedApiMatch

interface ApiMatchStaged extends ApiMatch {
  stage?: string
  matchday?: number | null
  utcDate?: string
}

// Preia toate meciurile unei competiții împreună cu faza (stage), etapa
// (matchday) și ora fiecăruia. Folosit la importul care CREEAZĂ meciuri.
export async function fetchStagedMatches(
  token: string,
  competitionCode: number,
): Promise<StagedApiMatch[]> {
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

  const data = (await res.json()) as { matches?: ApiMatchStaged[] }
  const matches = data.matches ?? []

  return matches.map((m) => {
    // Scorul de la 90 de minute (fără prelungiri/penalty-uri).
    const reg = m.score ? extractRegulationScore(m.score) : { home: null, away: null }
    return {
      apiStage: m.stage ?? '',
      matchday: m.matchday ?? null,
      kickoff: m.utcDate ? new Date(m.utcDate).toISOString() : '',
      roHome: mapApiTeamToRo(m.homeTeam),
      roAway: mapApiTeamToRo(m.awayTeam),
      rawHome: m.homeTeam?.name ?? null,
      rawAway: m.awayTeam?.name ?? null,
      homeScore: reg.home,
      awayScore: reg.away,
    }
  })
}

// Compat: importul fazei eliminatorii CM folosește World Cup (cod 2000).
export async function fetchWorldCupMatchesStaged(
  token: string,
): Promise<StagedApiMatch[]> {
  return fetchStagedMatches(token, WORLD_CUP_COMPETITION)
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
    .map((m) => {
      // Scorul de la 90 de minute (fără prelungiri/penalty-uri).
      const reg = m.score ? extractRegulationScore(m.score) : { home: null, away: null }
      return {
        homeTeam: m.homeTeam.name as string,
        awayTeam: m.awayTeam.name as string,
        kickoff: new Date(m.utcDate as string).toISOString(),
        homeScore: reg.home,
        awayScore: reg.away,
        matchday: m.matchday ?? null,
      }
    })
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

  // Numele „efectiv" al unei echipe din API: numele mapat la RO (echipe
  // naționale) sau, dacă nu există mapare, numele brut (cluburi la CL).
  const effHome = (a: NormalizedApiMatch) => a.roHome ?? a.rawHome
  const effAway = (a: NormalizedApiMatch) => a.roAway ?? a.rawAway

  // Index API după perechea de echipe (neordonată). O pereche poate avea MAI
  // MULTE meciuri (ex. tur-retur în Champions League), deci stocăm o listă.
  const apiByPair = new Map<string, NormalizedApiMatch[]>()
  for (const a of apiMatches) {
    const h = effHome(a)
    const aw = effAway(a)
    if (!h || !aw) continue
    const key = teamPairKey(h, aw)
    const arr = apiByPair.get(key)
    if (arr) arr.push(a)
    else apiByPair.set(key, [a])
  }

  const updates: ScoreUpdate[] = []
  for (const m of firestoreMatches) {
    // Scor corectat manual de admin: nu îl atingem (furnizorul poate greși).
    if (m.scoreOverride === true) continue

    const candidates = apiByPair.get(teamPairKey(m.homeTeam, m.awayTeam))
    if (!candidates || candidates.length === 0) continue

    // Când sunt mai multe meciuri pentru aceeași pereche (tur-retur), alegem
    // manșa cu ora de start cea mai apropiată de meciul nostru, ca să nu
    // aplicăm scorul unei manșe pe cealaltă.
    let api = candidates[0]
    if (candidates.length > 1) {
      const target = m.kickoff ? +new Date(m.kickoff) : NaN
      if (!Number.isNaN(target)) {
        api = candidates.reduce((best, c) => {
          const cd = c.kickoff ? Math.abs(+new Date(c.kickoff) - target) : Infinity
          const bd = best.kickoff ? Math.abs(+new Date(best.kickoff) - target) : Infinity
          return cd < bd ? c : best
        }, candidates[0])
      }
    }

    const usable = isFinalStatus(api.status) || (includeLive && isLiveStatus(api.status))
    if (!usable) continue
    if (api.homeScore === null || api.awayScore === null) continue

    // Aliniază scorurile la orientarea gazdă/oaspete din orarul nostru.
    let toHome = api.homeScore
    let toAway = api.awayScore
    const sameOrientation = normalize(m.homeTeam) === normalize(effHome(api) as string)
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
