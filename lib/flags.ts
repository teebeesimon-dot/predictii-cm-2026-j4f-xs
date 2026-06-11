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

// Întoarce codul flagcdn pentru o echipă, sau null dacă nu e cunoscută
// (ex. placeholder „Câștigătoare Grupa A" în faza eliminatorie).
export function getFlagCode(team: string): string | null {
  return TEAM_FLAG_CODES[team] ?? null
}

// URL-ul imaginii steagului (flagcdn.com). `w` controlează lățimea variantei.
export function getFlagUrl(team: string, w: 20 | 40 | 80 = 40): string | null {
  const code = getFlagCode(team)
  if (!code) return null
  return `https://flagcdn.com/w${w}/${code}.png`
}
