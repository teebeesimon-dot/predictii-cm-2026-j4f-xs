import { type NextRequest, NextResponse } from 'next/server'
import { notificationEngine } from '@/lib/notifications/engine/NotificationEngine'

/**
 * Cron: rulează Notification Engine în mod LIVE (trimite + salvează în istoric).
 *
 * Apelat de Vercel Cron (vezi vercel.json) și/sau de un cron extern
 * (ex. cron-job.org) la fiecare 5 minute. Engine-ul se ocupă singur de
 * deduplicare via `notification_history`, deci rulările dese sunt sigure: o
 * notificare nu se trimite de două ori.
 *
 * Securizare prin CRON_SECRET, acceptat în mai multe forme (ca la sync-results):
 *   - header  Authorization: Bearer <secret>   (formatul folosit de Vercel Cron)
 *   - header  x-cron-secret: <secret>
 *   - query   ?secret=<secret>
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  // Fără secret setat refuzăm (mai sigur decât să fie deschis).
  if (!secret) return false

  const auth = req.headers.get('authorization')
  if (auth && auth === `Bearer ${secret}`) return true

  const header = req.headers.get('x-cron-secret')
  if (header && header === secret) return true

  const query = req.nextUrl.searchParams.get('secret')
  if (query && query === secret) return true

  return false
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, message: 'Neautorizat. Secret lipsă sau invalid.' },
      { status: 401 },
    )
  }

  try {
    const result = await notificationEngine.run('live')
    console.log(
      `[v0] cron notif-engine: ${result.dispatched} trimise, ` +
        `${result.alreadySentSkipped} deja trimise, ${result.pushSent} push.`,
    )
    return NextResponse.json({
      ok: true,
      dispatched: result.dispatched,
      pushSent: result.pushSent,
      pushFailed: result.pushFailed,
      alreadySentSkipped: result.alreadySentSkipped,
      notificationsGenerated: result.notificationsGenerated,
      executionTime: result.executionTime,
      errors: result.errors,
    })
  } catch (e) {
    console.log('[v0] cron notif-engine: eroare:', (e as Error).message)
    return NextResponse.json(
      { ok: false, message: (e as Error).message },
      { status: 500 },
    )
  }
}

// Vercel Cron folosește GET. Acceptăm și POST pentru cron-uri externe.
export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
