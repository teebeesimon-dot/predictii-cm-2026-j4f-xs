// Mapează fiecare echipă (numele românesc folosit în program) la codul de țară
// ISO 3166-1 alpha-2 folosit de flagcdn.com pentru afișarea steagului.
// Anglia și Scoția folosesc subdiviziunile GB suportate de flagcdn.
const TEAM_FLAG_CODES: Record<string, string> = {
  // Grupa A
  Mexic: 'mx',
  'Africa de Sud': 'za',
  'Coreea de Sud': 'kr',
  Cehia: 'cz',
  // Grupa B
  Canada: 'ca',
  'Bosnia și Herțegovina': 'ba',
  Qatar: 'qa',
  Elveția: 'ch',
  // Grupa C
  Brazilia: 'br',
  Maroc: 'ma',
  Haiti: 'ht',
  Scoția: 'gb-sct',
  // Grupa D
  SUA: 'us',
  Paraguay: 'py',
  Australia: 'au',
  Turcia: 'tr',
  // Grupa E
  Germania: 'de',
  Curaçao: 'cw',
  'Coasta de Fildeș': 'ci',
  Ecuador: 'ec',
  // Grupa F
  Olanda: 'nl',
  Japonia: 'jp',
  Suedia: 'se',
  Tunisia: 'tn',
  // Grupa G
  Belgia: 'be',
  Egipt: 'eg',
  Iran: 'ir',
  'Noua Zeelandă': 'nz',
  // Grupa H
  Spania: 'es',
  'Capul Verde': 'cv',
  'Arabia Saudită': 'sa',
  Uruguay: 'uy',
  // Grupa I
  Franța: 'fr',
  Senegal: 'sn',
  Irak: 'iq',
  Norvegia: 'no',
  // Grupa J
  Argentina: 'ar',
  Algeria: 'dz',
  Austria: 'at',
  Iordania: 'jo',
  // Grupa K
  Portugalia: 'pt',
  'RD Congo': 'cd',
  Uzbekistan: 'uz',
  Columbia: 'co',
  // Grupa L
  Anglia: 'gb-eng',
  Croația: 'hr',
  Ghana: 'gh',
  Panama: 'pa',
}

// Emblemele cluburilor din Champions League, furnizate de football-data.org.
// Sunt indexate după numele exact salvat de importul CL în Firestore.
const CLUB_CREST_URLS: Record<string, string> = {
  'Borussia Dortmund': 'https://crests.football-data.org/4.png',
  'FC Bayern München': 'https://crests.football-data.org/5.png',
  'VfB Stuttgart': 'https://crests.football-data.org/10.png',
  'Arsenal FC': 'https://crests.football-data.org/57.png',
  'Aston Villa FC': 'https://crests.football-data.org/58.png',
  'Liverpool FC': 'https://crests.football-data.org/64.png',
  'Manchester City FC': 'https://crests.football-data.org/65.png',
  'Manchester United FC': 'https://crests.football-data.org/66.png',
  'Club Atlético de Madrid': 'https://crests.football-data.org/78.png',
  'FC Barcelona': 'https://crests.football-data.org/81.png',
  'Real Madrid CF': 'https://crests.football-data.org/86.png',
  'Real Betis Balompié': 'https://crests.football-data.org/90.png',
  'Villarreal CF': 'https://crests.football-data.org/94.png',
  'AS Roma': 'https://crests.football-data.org/100.png',
  'FC Internazionale Milano': 'https://crests.football-data.org/108.png',
  'SSC Napoli': 'https://crests.football-data.org/113.png',
  'Sporting Clube de Portugal': 'https://crests.football-data.org/498.png',
  'FC Porto': 'https://crests.football-data.org/503.png',
  'Lille OSC': 'https://crests.football-data.org/521.png',
  'Paris Saint-Germain FC': 'https://crests.football-data.org/524.png',
  'Racing Club de Lens': 'https://crests.football-data.org/546.png',
  'Galatasaray SK': 'https://crests.football-data.org/610.png',
  'Fenerbahçe SK': 'https://crests.football-data.org/613.png',
  PSV: 'https://crests.football-data.org/674.png',
  'Feyenoord Rotterdam': 'https://crests.football-data.org/675.png',
  'RB Leipzig': 'https://crests.football-data.org/721.png',
  'Club Brugge KV': 'https://crests.football-data.org/851.png',
  'SK Slavia Praha': 'https://crests.football-data.org/930.png',
  'FK Shakhtar Donetsk': 'https://crests.football-data.org/1887.png',
  'PAE AEK': 'https://crests.football-data.org/1899.png',
  'LASK Linz': 'https://crests.football-data.org/2016.png',
  'Viking FK': 'https://crests.football-data.org/5720.png',
  'FK Bodø/Glimt': 'https://crests.football-data.org/5721.png',
  'Como 1907': 'https://crests.football-data.org/7397.png',
  'ŠK Slovan Bratislava': 'https://crests.football-data.org/7509.png',
  'Sabah FK': 'https://crests.football-data.org/10233.png',
}

// Întoarce codul flagcdn pentru o echipă, sau null dacă nu e cunoscută.
export function getFlagCode(team: string): string | null {
  return TEAM_FLAG_CODES[team] ?? null
}

// Întoarce emblema clubului sau steagul naționalei.
export function getFlagUrl(team: string, w: 20 | 40 | 80 = 40): string | null {
  const crest = CLUB_CREST_URLS[team]
  if (crest) return crest
  const code = getFlagCode(team)
  if (!code) return null
  return `https://flagcdn.com/w${w}/${code}.png`
}
