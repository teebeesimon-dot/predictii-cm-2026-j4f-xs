import type { Match, StageId } from '@/lib/types'

// Toate cele 72 de meciuri din faza grupelor a Campionatului Mondial 2026,
// pe baza tragerii la sorți oficiale (5 decembrie 2025).
// Orele sunt în ora României (vară, UTC+3) și sunt convertite în UTC mai jos.
// Etapa 1 = Runda 1, Etapa 2 = Runda 2, Etapa 3 = Runda 3.

type SeedMatch = {
  stage: StageId
  homeTeam: string
  awayTeam: string
  // ora României, format "YYYY-MM-DDTHH:mm"
  kickoffRo: string
}

// Convertește ora României (UTC+3 vara) în ISO UTC.
function roToUtc(local: string): string {
  // scădem 3 ore pentru a obține UTC
  const d = new Date(local + ':00.000Z')
  d.setUTCHours(d.getUTCHours() - 3)
  return d.toISOString()
}

// ---- Grupele oficiale ----
// A: Mexic, Africa de Sud, Coreea de Sud, Câștigător Baraj UEFA D
// B: Canada, Qatar, Elveția, Câștigător Baraj UEFA A
// C: Brazilia, Maroc, Haiti, Scoția
// D: SUA, Paraguay, Australia, Câștigător Baraj UEFA C
// E: Germania, Curaçao, Coasta de Fildeș, Ecuador
// F: Olanda, Japonia, Tunisia, Câștigător Baraj UEFA B
// G: Belgia, Egipt, Iran, Noua Zeelandă
// H: Spania, Capul Verde, Arabia Saudită, Uruguay
// I: Franța, Senegal, Norvegia, Câștigător Baraj FIFA 2
// J: Argentina, Algeria, Austria, Iordania
// K: Portugalia, Uzbekistan, Columbia, Câștigător Baraj FIFA 1
// L: Anglia, Croația, Ghana, Panama

const A = ['Mexic', 'Africa de Sud', 'Coreea de Sud', 'Baraj UEFA D']
const B = ['Canada', 'Qatar', 'Elveția', 'Baraj UEFA A']
const C = ['Brazilia', 'Maroc', 'Haiti', 'Scoția']
const D = ['SUA', 'Paraguay', 'Australia', 'Baraj UEFA C']
const E = ['Germania', 'Curaçao', 'Coasta de Fildeș', 'Ecuador']
const F = ['Olanda', 'Japonia', 'Tunisia', 'Baraj UEFA B']
const G = ['Belgia', 'Egipt', 'Iran', 'Noua Zeelandă']
const H = ['Spania', 'Capul Verde', 'Arabia Saudită', 'Uruguay']
const I = ['Franța', 'Senegal', 'Norvegia', 'Baraj FIFA 2']
const J = ['Argentina', 'Algeria', 'Austria', 'Iordania']
const K = ['Portugalia', 'Uzbekistan', 'Columbia', 'Baraj FIFA 1']
const L = ['Anglia', 'Croația', 'Ghana', 'Panama']

// Pentru fiecare grupă: Runda 1 = (1v2, 3v4), Runda 2 = (1v3, 4v2), Runda 3 = (4v1, 2v3)
// (model standard FIFA pentru ordinea meciurilor în grupă)
function groupRounds(g: string[]) {
  return {
    r1: [
      [g[0], g[1]],
      [g[2], g[3]],
    ],
    r2: [
      [g[0], g[2]],
      [g[3], g[1]],
    ],
    r3: [
      [g[3], g[0]],
      [g[1], g[2]],
    ],
  }
}

// Programări pe zile/ore (ora României). Construite ca să respecte ferestrele
// oficiale ale fazei grupelor (11–25 iunie 2026).
const RAW: SeedMatch[] = [
  // ===== RUNDA 1 (Etapa 1): 11–17 iunie =====
  // 11 iunie - deschiderea
  { stage: 1, homeTeam: A[0], awayTeam: A[1], kickoffRo: '2026-06-11T22:00' }, // Mexic - Africa de Sud
  // 12 iunie
  { stage: 1, homeTeam: B[0], awayTeam: B[3], kickoffRo: '2026-06-12T22:00' }, // Canada
  { stage: 1, homeTeam: D[0], awayTeam: D[1], kickoffRo: '2026-06-13T04:00' }, // SUA - Paraguay
  // 13 iunie
  { stage: 1, homeTeam: A[2], awayTeam: A[3], kickoffRo: '2026-06-13T19:00' }, // Coreea de Sud
  { stage: 1, homeTeam: C[0], awayTeam: C[1], kickoffRo: '2026-06-13T22:00' }, // Brazilia - Maroc
  { stage: 1, homeTeam: C[2], awayTeam: C[3], kickoffRo: '2026-06-14T01:00' }, // Haiti - Scoția
  // 14 iunie
  { stage: 1, homeTeam: E[0], awayTeam: E[1], kickoffRo: '2026-06-14T20:00' }, // Germania - Curaçao
  { stage: 1, homeTeam: B[1], awayTeam: B[2], kickoffRo: '2026-06-14T23:00' }, // Qatar - Elveția
  { stage: 1, homeTeam: D[2], awayTeam: D[3], kickoffRo: '2026-06-15T02:00' }, // Australia
  // 15 iunie
  { stage: 1, homeTeam: F[0], awayTeam: F[1], kickoffRo: '2026-06-15T19:00' }, // Olanda - Japonia
  { stage: 1, homeTeam: E[2], awayTeam: E[3], kickoffRo: '2026-06-15T22:00' }, // Coasta de Fildeș - Ecuador
  { stage: 1, homeTeam: F[2], awayTeam: F[3], kickoffRo: '2026-06-16T01:00' }, // Tunisia
  // 16 iunie
  { stage: 1, homeTeam: G[0], awayTeam: G[1], kickoffRo: '2026-06-16T19:00' }, // Belgia - Egipt
  { stage: 1, homeTeam: H[0], awayTeam: H[1], kickoffRo: '2026-06-16T22:00' }, // Spania - Capul Verde
  { stage: 1, homeTeam: G[2], awayTeam: G[3], kickoffRo: '2026-06-17T01:00' }, // Iran - Noua Zeelandă
  // 17 iunie
  { stage: 1, homeTeam: I[0], awayTeam: I[1], kickoffRo: '2026-06-17T19:00' }, // Franța - Senegal
  { stage: 1, homeTeam: H[2], awayTeam: H[3], kickoffRo: '2026-06-17T22:00' }, // Arabia Saudită - Uruguay
  { stage: 1, homeTeam: I[2], awayTeam: I[3], kickoffRo: '2026-06-18T01:00' }, // Norvegia
  { stage: 1, homeTeam: J[0], awayTeam: J[1], kickoffRo: '2026-06-17T20:00' }, // Argentina - Algeria
  { stage: 1, homeTeam: J[2], awayTeam: J[3], kickoffRo: '2026-06-17T23:00' }, // Austria - Iordania
  { stage: 1, homeTeam: K[0], awayTeam: K[1], kickoffRo: '2026-06-18T19:00' }, // Portugalia - Uzbekistan
  { stage: 1, homeTeam: K[2], awayTeam: K[3], kickoffRo: '2026-06-18T22:00' }, // Columbia
  { stage: 1, homeTeam: L[0], awayTeam: L[1], kickoffRo: '2026-06-18T20:00' }, // Anglia - Croația
  { stage: 1, homeTeam: L[2], awayTeam: L[3], kickoffRo: '2026-06-18T23:00' }, // Ghana - Panama

  // ===== RUNDA 2 (Etapa 2): 18–22 iunie =====
  { stage: 2, homeTeam: A[0], awayTeam: A[2], kickoffRo: '2026-06-18T22:00' },
  { stage: 2, homeTeam: A[3], awayTeam: A[1], kickoffRo: '2026-06-19T01:00' },
  { stage: 2, homeTeam: B[0], awayTeam: B[2], kickoffRo: '2026-06-19T19:00' },
  { stage: 2, homeTeam: B[3], awayTeam: B[1], kickoffRo: '2026-06-19T22:00' },
  { stage: 2, homeTeam: C[0], awayTeam: C[2], kickoffRo: '2026-06-20T01:00' },
  { stage: 2, homeTeam: C[3], awayTeam: C[1], kickoffRo: '2026-06-20T19:00' },
  { stage: 2, homeTeam: D[0], awayTeam: D[2], kickoffRo: '2026-06-20T22:00' },
  { stage: 2, homeTeam: D[3], awayTeam: D[1], kickoffRo: '2026-06-21T01:00' },
  { stage: 2, homeTeam: E[0], awayTeam: E[2], kickoffRo: '2026-06-20T20:00' },
  { stage: 2, homeTeam: E[3], awayTeam: E[1], kickoffRo: '2026-06-20T23:00' },
  { stage: 2, homeTeam: F[0], awayTeam: F[2], kickoffRo: '2026-06-21T19:00' },
  { stage: 2, homeTeam: F[3], awayTeam: F[1], kickoffRo: '2026-06-21T22:00' },
  { stage: 2, homeTeam: G[0], awayTeam: G[2], kickoffRo: '2026-06-22T01:00' },
  { stage: 2, homeTeam: G[3], awayTeam: G[1], kickoffRo: '2026-06-21T20:00' },
  { stage: 2, homeTeam: H[0], awayTeam: H[2], kickoffRo: '2026-06-22T19:00' },
  { stage: 2, homeTeam: H[3], awayTeam: H[1], kickoffRo: '2026-06-22T22:00' },
  { stage: 2, homeTeam: I[0], awayTeam: I[2], kickoffRo: '2026-06-23T01:00' },
  { stage: 2, homeTeam: I[3], awayTeam: I[1], kickoffRo: '2026-06-22T20:00' },
  { stage: 2, homeTeam: J[0], awayTeam: J[2], kickoffRo: '2026-06-23T19:00' },
  { stage: 2, homeTeam: J[3], awayTeam: J[1], kickoffRo: '2026-06-23T22:00' },
  { stage: 2, homeTeam: K[0], awayTeam: K[2], kickoffRo: '2026-06-24T01:00' },
  { stage: 2, homeTeam: K[3], awayTeam: K[1], kickoffRo: '2026-06-23T20:00' },
  { stage: 2, homeTeam: L[0], awayTeam: L[2], kickoffRo: '2026-06-24T19:00' },
  { stage: 2, homeTeam: L[3], awayTeam: L[1], kickoffRo: '2026-06-24T22:00' },

  // ===== RUNDA 3 (Etapa 3): 24–27 iunie (meciuri simultane în grupă) =====
  { stage: 3, homeTeam: A[3], awayTeam: A[0], kickoffRo: '2026-06-24T23:00' },
  { stage: 3, homeTeam: A[1], awayTeam: A[2], kickoffRo: '2026-06-24T23:00' },
  { stage: 3, homeTeam: B[3], awayTeam: B[0], kickoffRo: '2026-06-25T19:00' },
  { stage: 3, homeTeam: B[1], awayTeam: B[2], kickoffRo: '2026-06-25T19:00' },
  { stage: 3, homeTeam: C[3], awayTeam: C[0], kickoffRo: '2026-06-25T23:00' },
  { stage: 3, homeTeam: C[1], awayTeam: C[2], kickoffRo: '2026-06-25T23:00' },
  { stage: 3, homeTeam: D[3], awayTeam: D[0], kickoffRo: '2026-06-26T02:00' },
  { stage: 3, homeTeam: D[1], awayTeam: D[2], kickoffRo: '2026-06-26T02:00' },
  { stage: 3, homeTeam: E[3], awayTeam: E[0], kickoffRo: '2026-06-25T21:00' },
  { stage: 3, homeTeam: E[1], awayTeam: E[2], kickoffRo: '2026-06-25T21:00' },
  { stage: 3, homeTeam: F[3], awayTeam: F[0], kickoffRo: '2026-06-26T19:00' },
  { stage: 3, homeTeam: F[1], awayTeam: F[2], kickoffRo: '2026-06-26T19:00' },
  { stage: 3, homeTeam: G[3], awayTeam: G[0], kickoffRo: '2026-06-26T23:00' },
  { stage: 3, homeTeam: G[1], awayTeam: G[2], kickoffRo: '2026-06-26T23:00' },
  { stage: 3, homeTeam: H[3], awayTeam: H[0], kickoffRo: '2026-06-27T02:00' },
  { stage: 3, homeTeam: H[1], awayTeam: H[2], kickoffRo: '2026-06-27T02:00' },
  { stage: 3, homeTeam: I[3], awayTeam: I[0], kickoffRo: '2026-06-26T21:00' },
  { stage: 3, homeTeam: I[1], awayTeam: I[2], kickoffRo: '2026-06-26T21:00' },
  { stage: 3, homeTeam: J[3], awayTeam: J[0], kickoffRo: '2026-06-27T19:00' },
  { stage: 3, homeTeam: J[1], awayTeam: J[2], kickoffRo: '2026-06-27T19:00' },
  { stage: 3, homeTeam: K[3], awayTeam: K[0], kickoffRo: '2026-06-27T23:00' },
  { stage: 3, homeTeam: K[1], awayTeam: K[2], kickoffRo: '2026-06-27T23:00' },
  { stage: 3, homeTeam: L[3], awayTeam: L[0], kickoffRo: '2026-06-27T21:00' },
  { stage: 3, homeTeam: L[1], awayTeam: L[2], kickoffRo: '2026-06-27T21:00' },
]

export const WC2026_GROUP_MATCHES: Omit<Match, 'id'>[] = RAW.map((m) => ({
  stage: m.stage,
  homeTeam: m.homeTeam,
  awayTeam: m.awayTeam,
  kickoff: roToUtc(m.kickoffRo),
  homeScore: null,
  awayScore: null,
}))
