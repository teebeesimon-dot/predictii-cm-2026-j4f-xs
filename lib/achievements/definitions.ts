/**
 * Catalogul complet de achievement-uri.
 *
 * Adăugarea unui achievement nou necesită DOAR un obiect nou în acest array.
 * Nu se modifică engine-ul, nu se modifică tipurile — sistemul e complet
 * deschis la extensie și închis la modificare.
 */

import type { AchievementDef } from '@/lib/achievements/types'

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ---- Primul pas ----
  {
    id: 'first-prediction',
    title: 'Primul pronostic',
    description: 'Ai trimis primul tău pronostic.',
    icon: 'Pencil',
    rarity: 'common',
    medal: 'bronze',
    progressTarget: 1,
    progressLabel: 'pronosticuri',
  },
  {
    id: 'first-exact',
    title: 'Scor exact!',
    description: 'Ai ghicit scorul exact al unui meci.',
    icon: 'Target',
    rarity: 'uncommon',
    medal: 'bronze',
    notificationCategory: 'achievements',
  },

  // ---- Scoruri exacte ----
  {
    id: 'exact-5',
    title: 'Ochitor',
    description: 'Ai ghicit 5 scoruri exacte.',
    icon: 'Crosshair',
    rarity: 'uncommon',
    medal: 'bronze',
    progressTarget: 5,
    progressLabel: 'scoruri exacte',
  },
  {
    id: 'exact-10',
    title: 'Lunetist',
    description: 'Ai ghicit 10 scoruri exacte.',
    icon: 'Crosshair',
    rarity: 'rare',
    medal: 'silver',
    progressTarget: 10,
    progressLabel: 'scoruri exacte',
  },
  {
    id: 'exact-25',
    title: 'Maestrul scorului',
    description: 'Ai ghicit 25 de scoruri exacte.',
    icon: 'Star',
    rarity: 'epic',
    medal: 'gold',
    progressTarget: 25,
    progressLabel: 'scoruri exacte',
  },

  // ---- Volum pronosticuri ----
  {
    id: 'predictions-100',
    title: 'Centurion',
    description: 'Ai trimis 100 de pronosticuri.',
    icon: 'Zap',
    rarity: 'uncommon',
    medal: 'bronze',
    progressTarget: 100,
    progressLabel: 'pronosticuri',
    notificationCategory: 'achievements',
  },
  {
    id: 'predictions-500',
    title: 'Veteran',
    description: 'Ai trimis 500 de pronosticuri.',
    icon: 'Shield',
    rarity: 'rare',
    medal: 'silver',
    progressTarget: 500,
    progressLabel: 'pronosticuri',
    notificationCategory: 'achievements',
  },
  {
    id: 'predictions-1000',
    title: 'Legenda ligii',
    description: 'Ai trimis 1000 de pronosticuri.',
    icon: 'Crown',
    rarity: 'legendary',
    medal: 'gold',
    progressTarget: 1000,
    progressLabel: 'pronosticuri',
    notificationCategory: 'achievements',
  },

  // ---- Clasament ----
  {
    id: 'top-10',
    title: 'Top 10',
    description: 'Ai terminat o competiție în primii 10.',
    icon: 'TrendingUp',
    rarity: 'common',
    medal: 'none',
  },
  {
    id: 'top-3',
    title: 'Podium',
    description: 'Ai terminat o competiție în primii 3.',
    icon: 'Medal',
    rarity: 'rare',
    medal: 'silver',
    notificationCategory: 'achievements',
  },
  {
    id: 'champion',
    title: 'Campion',
    description: 'Ai câștigat o competiție (locul 1).',
    icon: 'Trophy',
    rarity: 'legendary',
    medal: 'gold',
    notificationCategory: 'achievements',
  },

  // ---- Streak ----
  {
    id: 'streak-5',
    title: 'Constanță',
    description: '5 etape consecutive cu cel puțin un scor corect.',
    icon: 'Flame',
    rarity: 'uncommon',
    medal: 'bronze',
    progressTarget: 5,
    progressLabel: 'etape',
  },
  {
    id: 'streak-10',
    title: 'Pe val',
    description: '10 etape consecutive cu cel puțin un scor corect.',
    icon: 'Flame',
    rarity: 'rare',
    medal: 'silver',
    progressTarget: 10,
    progressLabel: 'etape',
  },

  // ---- Prima competiție ----
  {
    id: 'first-competition',
    title: 'Prima competiție',
    description: 'Ai participat la prima ta competiție.',
    icon: 'Flag',
    rarity: 'common',
    medal: 'bronze',
    notificationCategory: 'achievements',
  },

  // ---- Acuratețe ridicată ----
  {
    id: 'accuracy-50',
    title: 'Jumătate exactă',
    description: 'Ai obținut cel puțin 50% pronosticuri corecte 1X2 pe o etapă.',
    icon: 'BarChart2',
    rarity: 'uncommon',
    medal: 'none',
  },
  {
    id: 'accuracy-75',
    title: 'Precizie ridicată',
    description: 'Ai obținut cel puțin 75% pronosticuri corecte 1X2 pe o etapă.',
    icon: 'BarChart2',
    rarity: 'rare',
    medal: 'silver',
  },
]

// Index pentru lookup O(1).
export const ACHIEVEMENT_MAP: Map<string, AchievementDef> = new Map(
  ACHIEVEMENT_DEFS.map((d) => [d.id, d]),
)
