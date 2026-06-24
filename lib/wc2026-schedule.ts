import type { Match, StageId } from '@/lib/types'

// Toate cele 72 de meciuri din faza grupelor a Campionatului Mondial 2026.
//
// SURSA: programul oficial preluat din football-data.org (aceeași sursă pe care
// o folosim și pentru sincronizarea scorurilor). Orele sunt în UTC (sufix „Z")
// exact așa cum le returnează API-ul, deci ziua și ora afișate sunt corecte.
// Conversia în ora României se face la afișare (lib/utils.ts, Europe/Bucharest).
//
// Etapa 1 = Runda 1, Etapa 2 = Runda 2, Etapa 3 = Runda 3.
// Numele echipelor sunt în română (forma canonică folosită în toată aplicația).

type SeedMatch = {
  stage: StageId
  homeTeam: string
  awayTeam: string
  // ora oficială de start, în UTC (ISO 8601)
  kickoff: string
}

const RAW: SeedMatch[] = [
  // ===== RUNDA 1 (Etapa 1) =====
  { stage: 1, homeTeam: 'Mexic', awayTeam: 'Africa de Sud', kickoff: '2026-06-11T19:00:00.000Z' },
  { stage: 1, homeTeam: 'Coreea de Sud', awayTeam: 'Cehia', kickoff: '2026-06-12T02:00:00.000Z' },
  { stage: 1, homeTeam: 'Canada', awayTeam: 'Bosnia și Herțegovina', kickoff: '2026-06-12T19:00:00.000Z' },
  { stage: 1, homeTeam: 'SUA', awayTeam: 'Paraguay', kickoff: '2026-06-13T01:00:00.000Z' },
  { stage: 1, homeTeam: 'Qatar', awayTeam: 'Elveția', kickoff: '2026-06-13T19:00:00.000Z' },
  { stage: 1, homeTeam: 'Brazilia', awayTeam: 'Maroc', kickoff: '2026-06-13T22:00:00.000Z' },
  { stage: 1, homeTeam: 'Haiti', awayTeam: 'Scoția', kickoff: '2026-06-14T01:00:00.000Z' },
  { stage: 1, homeTeam: 'Australia', awayTeam: 'Turcia', kickoff: '2026-06-14T04:00:00.000Z' },
  { stage: 1, homeTeam: 'Germania', awayTeam: 'Curaçao', kickoff: '2026-06-14T17:00:00.000Z' },
  { stage: 1, homeTeam: 'Olanda', awayTeam: 'Japonia', kickoff: '2026-06-14T20:00:00.000Z' },
  { stage: 1, homeTeam: 'Coasta de Fildeș', awayTeam: 'Ecuador', kickoff: '2026-06-14T23:00:00.000Z' },
  { stage: 1, homeTeam: 'Suedia', awayTeam: 'Tunisia', kickoff: '2026-06-15T02:00:00.000Z' },
  { stage: 1, homeTeam: 'Spania', awayTeam: 'Capul Verde', kickoff: '2026-06-15T16:00:00.000Z' },
  { stage: 1, homeTeam: 'Belgia', awayTeam: 'Egipt', kickoff: '2026-06-15T19:00:00.000Z' },
  { stage: 1, homeTeam: 'Arabia Saudită', awayTeam: 'Uruguay', kickoff: '2026-06-15T22:00:00.000Z' },
  { stage: 1, homeTeam: 'Iran', awayTeam: 'Noua Zeelandă', kickoff: '2026-06-16T01:00:00.000Z' },
  { stage: 1, homeTeam: 'Franța', awayTeam: 'Senegal', kickoff: '2026-06-16T19:00:00.000Z' },
  { stage: 1, homeTeam: 'Irak', awayTeam: 'Norvegia', kickoff: '2026-06-16T22:00:00.000Z' },
  { stage: 1, homeTeam: 'Argentina', awayTeam: 'Algeria', kickoff: '2026-06-17T01:00:00.000Z' },
  { stage: 1, homeTeam: 'Austria', awayTeam: 'Iordania', kickoff: '2026-06-17T04:00:00.000Z' },
  { stage: 1, homeTeam: 'Portugalia', awayTeam: 'RD Congo', kickoff: '2026-06-17T17:00:00.000Z' },
  { stage: 1, homeTeam: 'Anglia', awayTeam: 'Croația', kickoff: '2026-06-17T20:00:00.000Z' },
  { stage: 1, homeTeam: 'Ghana', awayTeam: 'Panama', kickoff: '2026-06-17T23:00:00.000Z' },
  { stage: 1, homeTeam: 'Uzbekistan', awayTeam: 'Columbia', kickoff: '2026-06-18T02:00:00.000Z' },

  // ===== RUNDA 2 (Etapa 2) =====
  { stage: 2, homeTeam: 'Cehia', awayTeam: 'Africa de Sud', kickoff: '2026-06-18T16:00:00.000Z' },
  { stage: 2, homeTeam: 'Elveția', awayTeam: 'Bosnia și Herțegovina', kickoff: '2026-06-18T19:00:00.000Z' },
  { stage: 2, homeTeam: 'Canada', awayTeam: 'Qatar', kickoff: '2026-06-18T22:00:00.000Z' },
  { stage: 2, homeTeam: 'Mexic', awayTeam: 'Coreea de Sud', kickoff: '2026-06-19T01:00:00.000Z' },
  { stage: 2, homeTeam: 'SUA', awayTeam: 'Australia', kickoff: '2026-06-19T19:00:00.000Z' },
  { stage: 2, homeTeam: 'Scoția', awayTeam: 'Maroc', kickoff: '2026-06-19T22:00:00.000Z' },
  { stage: 2, homeTeam: 'Brazilia', awayTeam: 'Haiti', kickoff: '2026-06-20T00:30:00.000Z' },
  { stage: 2, homeTeam: 'Turcia', awayTeam: 'Paraguay', kickoff: '2026-06-20T03:00:00.000Z' },
  { stage: 2, homeTeam: 'Olanda', awayTeam: 'Suedia', kickoff: '2026-06-20T17:00:00.000Z' },
  { stage: 2, homeTeam: 'Germania', awayTeam: 'Coasta de Fildeș', kickoff: '2026-06-20T20:00:00.000Z' },
  { stage: 2, homeTeam: 'Ecuador', awayTeam: 'Curaçao', kickoff: '2026-06-21T00:00:00.000Z' },
  { stage: 2, homeTeam: 'Tunisia', awayTeam: 'Japonia', kickoff: '2026-06-21T04:00:00.000Z' },
  { stage: 2, homeTeam: 'Spania', awayTeam: 'Arabia Saudită', kickoff: '2026-06-21T16:00:00.000Z' },
  { stage: 2, homeTeam: 'Belgia', awayTeam: 'Iran', kickoff: '2026-06-21T19:00:00.000Z' },
  { stage: 2, homeTeam: 'Uruguay', awayTeam: 'Capul Verde', kickoff: '2026-06-21T22:00:00.000Z' },
  { stage: 2, homeTeam: 'Noua Zeelandă', awayTeam: 'Egipt', kickoff: '2026-06-22T01:00:00.000Z' },
  { stage: 2, homeTeam: 'Argentina', awayTeam: 'Austria', kickoff: '2026-06-22T17:00:00.000Z' },
  { stage: 2, homeTeam: 'Franța', awayTeam: 'Irak', kickoff: '2026-06-22T21:00:00.000Z' },
  { stage: 2, homeTeam: 'Norvegia', awayTeam: 'Senegal', kickoff: '2026-06-23T00:00:00.000Z' },
  { stage: 2, homeTeam: 'Iordania', awayTeam: 'Algeria', kickoff: '2026-06-23T03:00:00.000Z' },
  { stage: 2, homeTeam: 'Portugalia', awayTeam: 'Uzbekistan', kickoff: '2026-06-23T17:00:00.000Z' },
  { stage: 2, homeTeam: 'Anglia', awayTeam: 'Ghana', kickoff: '2026-06-23T20:00:00.000Z' },
  { stage: 2, homeTeam: 'Panama', awayTeam: 'Croația', kickoff: '2026-06-23T23:00:00.000Z' },
  { stage: 2, homeTeam: 'Columbia', awayTeam: 'RD Congo', kickoff: '2026-06-24T02:00:00.000Z' },

  // ===== RUNDA 3 (Etapa 3): meciuri simultane în grupă =====
  { stage: 3, homeTeam: 'Elveția', awayTeam: 'Canada', kickoff: '2026-06-24T19:00:00.000Z' },
  { stage: 3, homeTeam: 'Bosnia și Herțegovina', awayTeam: 'Qatar', kickoff: '2026-06-24T19:00:00.000Z' },
  { stage: 3, homeTeam: 'Maroc', awayTeam: 'Haiti', kickoff: '2026-06-24T22:00:00.000Z' },
  { stage: 3, homeTeam: 'Scoția', awayTeam: 'Brazilia', kickoff: '2026-06-24T22:00:00.000Z' },
  { stage: 3, homeTeam: 'Cehia', awayTeam: 'Mexic', kickoff: '2026-06-25T01:00:00.000Z' },
  { stage: 3, homeTeam: 'Africa de Sud', awayTeam: 'Coreea de Sud', kickoff: '2026-06-25T01:00:00.000Z' },
  { stage: 3, homeTeam: 'Ecuador', awayTeam: 'Germania', kickoff: '2026-06-25T20:00:00.000Z' },
  { stage: 3, homeTeam: 'Curaçao', awayTeam: 'Coasta de Fildeș', kickoff: '2026-06-25T20:00:00.000Z' },
  { stage: 3, homeTeam: 'Tunisia', awayTeam: 'Olanda', kickoff: '2026-06-25T23:00:00.000Z' },
  { stage: 3, homeTeam: 'Japonia', awayTeam: 'Suedia', kickoff: '2026-06-25T23:00:00.000Z' },
  { stage: 3, homeTeam: 'Turcia', awayTeam: 'SUA', kickoff: '2026-06-26T02:00:00.000Z' },
  { stage: 3, homeTeam: 'Paraguay', awayTeam: 'Australia', kickoff: '2026-06-26T02:00:00.000Z' },
  { stage: 3, homeTeam: 'Norvegia', awayTeam: 'Franța', kickoff: '2026-06-26T19:00:00.000Z' },
  { stage: 3, homeTeam: 'Senegal', awayTeam: 'Irak', kickoff: '2026-06-26T19:00:00.000Z' },
  { stage: 3, homeTeam: 'Uruguay', awayTeam: 'Spania', kickoff: '2026-06-27T00:00:00.000Z' },
  { stage: 3, homeTeam: 'Capul Verde', awayTeam: 'Arabia Saudită', kickoff: '2026-06-27T00:00:00.000Z' },
  { stage: 3, homeTeam: 'Noua Zeelandă', awayTeam: 'Belgia', kickoff: '2026-06-27T03:00:00.000Z' },
  { stage: 3, homeTeam: 'Egipt', awayTeam: 'Iran', kickoff: '2026-06-27T03:00:00.000Z' },
  { stage: 3, homeTeam: 'Panama', awayTeam: 'Anglia', kickoff: '2026-06-27T21:00:00.000Z' },
  { stage: 3, homeTeam: 'Croația', awayTeam: 'Ghana', kickoff: '2026-06-27T21:00:00.000Z' },
  { stage: 3, homeTeam: 'Columbia', awayTeam: 'Portugalia', kickoff: '2026-06-27T23:30:00.000Z' },
  { stage: 3, homeTeam: 'RD Congo', awayTeam: 'Uzbekistan', kickoff: '2026-06-27T23:30:00.000Z' },
  { stage: 3, homeTeam: 'Iordania', awayTeam: 'Argentina', kickoff: '2026-06-28T02:00:00.000Z' },
  { stage: 3, homeTeam: 'Algeria', awayTeam: 'Austria', kickoff: '2026-06-28T02:00:00.000Z' },
]

export const WC2026_GROUP_MATCHES: Omit<Match, 'id'>[] = RAW.map((m) => ({
  stage: m.stage,
  homeTeam: m.homeTeam,
  awayTeam: m.awayTeam,
  kickoff: m.kickoff,
  homeScore: null,
  awayScore: null,
}))
