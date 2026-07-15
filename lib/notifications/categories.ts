// Mapare PURĂ între o notificare și categoria/preferința ei + deep-link.
//
// Este folosită atât pe client (Centrul de notificări filtrează pe canalul
// in-app), cât și pe server (engine-ul filtrează pe canalul push). Nu importă
// nimic „server-only", deci poate fi refolosită oriunde.

import type { NotificationCategory } from '@/lib/types'

// Din tipul semantic al notificării (și, dacă e disponibil, `metadata.kind`)
// deducem categoria de preferințe. Tipurile viitoare (match-started etc.) sunt
// deja acoperite, deci regulile noi nu necesită modificări aici.
export function categoryForNotification(
  type: string,
  kind?: string,
): NotificationCategory {
  const t = (kind || type || '').toLowerCase()
  if (t.startsWith('deadline')) return 'deadline'
  if (t.startsWith('stage-opened')) return 'announcements'
  if (t.startsWith('stage-closed')) return 'general'
  if (t.startsWith('match-started') || t === 'match-start') return 'matchStarted'
  if (t.startsWith('match-finished') || t === 'match-end') return 'matchFinished'
  if (t.startsWith('standings')) return 'standings'
  if (t.startsWith('resume')) return 'resume'
  if (t.startsWith('announce')) return 'announcements'
  return 'general'
}

// Deep-link-ul (ruta internă) către care duce o notificare când e apăsată.
// Bazat pe metadata generică produsă de reguli (kind + editionId etc.).
export function deepLinkForNotification(metadata: Record<string, unknown>): string {
  const kind = String(metadata.kind ?? '')
  if (kind.startsWith('deadline') || kind.startsWith('stage')) {
    return '/predictions'
  }
  if (kind.startsWith('standings')) return '/standings'
  if (kind.startsWith('match')) return '/dashboard'
  return '/dashboard'
}
