// Definiția etapelor per-competiție.
//
// Fiecare competiție are propriul set de etape (număr și denumiri diferite):
//  - World Cup / Euro: 5 etape (3 grupe + șaisprezecimi + faza eliminatorie).
//  - Champions League: 11 etape (8 din faza-ligă + play-off + optimi + restul
//    fazei eliminatorii).
//
// Termenele limită NU se definesc aici — ele sunt calculate/rezolvate per
// competiție de „scheduler" (lib/schedule.ts): World Cup folosește termene fixe
// (lib/types.ts), iar celelalte competiții le calculează din programul real.

import { getEdition, type CompetitionId } from './editions'

export interface StageDef {
  id: number
  name: string // ex. „Etapa 1"
  short: string // ex. „E1"
  label: string // descriere lungă
}

// World Cup / Euro (structură clasică de turneu final).
export const WC_STAGES: StageDef[] = [
  { id: 1, name: 'Etapa 1', short: 'E1', label: 'Faza grupelor - Runda 1' },
  { id: 2, name: 'Etapa 2', short: 'E2', label: 'Faza grupelor - Runda 2' },
  { id: 3, name: 'Etapa 3', short: 'E3', label: 'Faza grupelor - Runda 3' },
  { id: 4, name: 'Etapa 4', short: 'E4', label: 'Saisprezecimi (Round of 32)' },
  {
    id: 5,
    name: 'Etapa 5',
    short: 'E5',
    label: 'Faza eliminatorie (optimi → finală, inclusiv finala mică)',
  },
]

// Champions League: 8 etape în faza-ligă (câte 18 meciuri) + fazele eliminatorii.
function buildClStages(): StageDef[] {
  const list: StageDef[] = []
  for (let i = 1; i <= 8; i++) {
    list.push({
      id: i,
      name: `Etapa ${i}`,
      short: `E${i}`,
      label: `Faza grupelor - Runda ${i}`,
    })
  }
  list.push({
    id: 9,
    name: 'Etapa 9',
    short: 'E9',
    label: 'Play-off (baraj, tur-retur)',
  })
  list.push({
    id: 10,
    name: 'Etapa 10',
    short: 'E10',
    label: 'Optimi de finală (tur-retur)',
  })
  list.push({
    id: 11,
    name: 'Etapa 11',
    short: 'E11',
    label: 'Sferturi, semifinale și finală',
  })
  return list
}

export const CL_STAGES: StageDef[] = buildClStages()

// Etapele pentru o competiție.
export function stagesForCompetition(competitionId: CompetitionId): StageDef[] {
  if (competitionId === 'cl') return CL_STAGES
  return WC_STAGES // wc + euro
}

// Etapele pentru o ediție (rezolvă competiția din ediție).
export function stagesForEdition(editionId: string): StageDef[] {
  return stagesForCompetition(getEdition(editionId)?.competitionId ?? 'wc')
}
