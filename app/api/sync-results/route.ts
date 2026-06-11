import { NextRequest, NextResponse } from 'next/server'
import { runResultsSync } from '@/lib/sync-results'

// Acest endpoint este apelat de cron-ul extern gratuit (ex. cron-job.org) la
// fiecare 10 minute, dar și manual din panoul de admin.
//
// Securizare: necesită secretul SYNC_SECRET. Îl acceptăm în mai multe forme,
// ca să fie ușor de configurat în orice serviciu de cron:
//   - header  x-sync-secret: <secret>
//   - header  Authorization: Bearer <secret>
//   - query   ?secret=<secret>
//
// Rulează pe runtime Node.js (Firestore web SDK are nevoie de el) și nu se
// cache-uiește niciodată.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.SYNC_SECRET
  // Dacă nu e setat un secret, refuzăm (mai sigur decât să fie deschis).
  if (!secret) return false

  const headerSecret = req.headers.get('x-sync-secret')
  if (headerSecret && headerSecret === secret) return true

  const auth = req.headers.get('authorization')
  if (auth && auth === `Bearer ${secret}`) return true

  const querySecret = req.nextUrl.searchParams.get('secret')
  if (querySecret && querySecret === secret) return true

  return false
}

async function handle(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { ok: false, message: 'Neautorizat. Secret lipsă sau invalid.' },
      { status: 401 },
    )
  }

  // includeLive=1 actualizează și scorurile meciurilor în desfășurare, nu doar
  // pe cele finalizate. Implicit (fără parametru) actualizăm doar finalele.
  const includeLive = req.nextUrl.searchParams.get('includeLive') === '1'

  const result = await runResultsSync({ includeLive })
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}

// Acceptăm atât GET (cel mai simplu pentru cron-uri) cât și POST.
export async function GET(req: NextRequest) {
  return handle(req)
}

export async function POST(req: NextRequest) {
  return handle(req)
}
