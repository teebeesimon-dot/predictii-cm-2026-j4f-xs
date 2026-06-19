// Registrul de competiții și ediții (competiție + an) pentru platforma
// „Predictii Just4Fun". Fiecare ediție are propria temă vizuală și propriul
// cod football-data folosit la încărcarea meciurilor.

export type CompetitionId = 'wc' | 'euro' | 'cl'

// Cheia temei aplicată prin atributul data-competition pe <html>.
export type CompetitionTheme = 'wc' | 'euro' | 'cl'

export interface Competition {
  id: CompetitionId
  name: string // nume complet, afișat
  short: string // etichetă scurtă pentru selector
  theme: CompetitionTheme
  // codul competiției în football-data.org (folosit la încărcarea meciurilor)
  footballDataCode: number
  // identitate vizuală originală (generată), per competiție
  logo: string
  mascot: string
}

export interface Edition {
  id: string // `${competitionId}-${year}`, ex. "wc-2026"
  competitionId: CompetitionId
  year: number
  label: string // ex. "World Cup 2026"
}

// Coduri football-data.org:
//  World Cup = 2000 · Champions League = 2001 · European Championship = 2018
export const COMPETITIONS: Record<CompetitionId, Competition> = {
  wc: {
    id: 'wc',
    name: 'World Cup',
    short: 'World Cup',
    theme: 'wc',
    footballDataCode: 2000,
    logo: '/competitions/wc-logo.png',
    mascot: '/competitions/wc-mascot.png',
  },
  euro: {
    id: 'euro',
    name: 'European Championship',
    short: 'Euro',
    theme: 'euro',
    footballDataCode: 2018,
    logo: '/competitions/euro-logo.png',
    mascot: '/competitions/euro-mascot.png',
  },
  cl: {
    id: 'cl',
    name: 'Champions League',
    short: 'Champions League',
    theme: 'cl',
    footballDataCode: 2001,
    logo: '/competitions/cl-logo.png',
    mascot: '/competitions/cl-mascot.png',
  },
}

// Generăm edițiile predefinite pentru următorii ~9 ani.
//  - World Cup: din 4 în 4 ani (2026, 2030, 2034)
//  - Euro: din 4 în 4 ani (2028, 2032)
//  - Champions League: în fiecare an (2026 → 2035)
function buildEditions(): Edition[] {
  const list: Edition[] = []
  const add = (competitionId: CompetitionId, year: number) => {
    list.push({
      id: `${competitionId}-${year}`,
      competitionId,
      year,
      label: `${COMPETITIONS[competitionId].name} ${year}`,
    })
  }

  for (const y of [2026, 2030, 2034]) add('wc', y)
  for (const y of [2028, 2032]) add('euro', y)
  for (let y = 2026; y <= 2035; y++) add('cl', y)

  return list
}

export const EDITIONS: Edition[] = buildEditions()

// Ediția implicită / curentă (singura populată la lansare).
export const DEFAULT_EDITION_ID = 'wc-2026'

export function getEdition(id: string): Edition | undefined {
  return EDITIONS.find((e) => e.id === id)
}

export function getCompetition(id: string): Competition | undefined {
  const edition = getEdition(id)
  if (!edition) return undefined
  return COMPETITIONS[edition.competitionId]
}

// Toți anii disponibili pentru o competiție (sortați crescător).
export function yearsForCompetition(competitionId: CompetitionId): number[] {
  return EDITIONS.filter((e) => e.competitionId === competitionId)
    .map((e) => e.year)
    .sort((a, b) => a - b)
}

// Lista competițiilor în ordinea de afișare în selector.
export const COMPETITION_ORDER: CompetitionId[] = ['wc', 'euro', 'cl']
