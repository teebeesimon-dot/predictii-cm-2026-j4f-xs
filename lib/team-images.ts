import {
  TEAM_IMAGES_BY_COMPETITION,
  type CompetitionId,
} from './editions'
import { getFlagUrl } from './flags'

const CLUB_IDS: Record<string, number> = {}

function normalize(teamName: string): string {
  return teamName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function club(id: number, ...names: string[]) {
  for (const name of names) CLUB_IDS[normalize(name)] = id
}

club(57, 'Arsenal FC', 'Arsenal')
club(58, 'Aston Villa FC', 'Aston Villa')
club(61, 'Chelsea FC', 'Chelsea')
club(64, 'Liverpool FC', 'Liverpool')
club(65, 'Manchester City FC', 'Manchester City')
club(66, 'Manchester United FC', 'Manchester United')
club(67, 'Newcastle United FC', 'Newcastle United')
club(73, 'Tottenham Hotspur FC', 'Tottenham Hotspur')
club(77, 'Athletic Club', 'Athletic Bilbao')
club(78, 'Club Atlético de Madrid', 'Atlético de Madrid', 'Atletico Madrid')
club(81, 'FC Barcelona', 'Barcelona')
club(86, 'Real Madrid CF', 'Real Madrid')
club(94, 'Villarreal CF', 'Villarreal')
club(3, 'Bayer 04 Leverkusen', 'Bayer Leverkusen')
club(4, 'Borussia Dortmund')
club(5, 'FC Bayern München', 'Bayern München', 'Bayern Munich')
club(19, 'Eintracht Frankfurt')
club(721, 'RB Leipzig')
club(98, 'AC Milan')
club(102, 'Atalanta BC', 'Atalanta')
club(108, 'FC Internazionale Milano', 'Inter Milan', 'Internazionale')
club(109, 'Juventus FC', 'Juventus')
club(113, 'SSC Napoli', 'Napoli')
club(516, 'Olympique de Marseille', 'Marseille')
club(524, 'Paris Saint-Germain FC', 'Paris Saint-Germain', 'PSG')
club(548, 'AS Monaco FC', 'AS Monaco', 'Monaco')
club(674, 'PSV', 'PSV Eindhoven')
club(675, 'Feyenoord Rotterdam', 'Feyenoord')
club(678, 'AFC Ajax', 'Ajax')
club(498, 'Sporting Clube de Portugal', 'Sporting CP')
club(503, 'FC Porto', 'Porto')
club(1903, 'SL Benfica', 'Benfica')

function getClubLogo(teamName: string): string | null {
  const id = CLUB_IDS[normalize(teamName)]
  return id ? `https://crests.football-data.org/${id}.png` : null
}

export function getTeamImage(
  teamName: string,
  competition: CompetitionId,
  flagSize: 20 | 40 | 80 = 20,
): string | null {
  return TEAM_IMAGES_BY_COMPETITION[competition] === 'clubs'
    ? getClubLogo(teamName)
    : getFlagUrl(teamName, flagSize)
}
