// Repară corupția produsă de re-sincronizarea greșită (mapare după kickoff,
// care nu e unic). Strategie:
//  - Etapele 1 & 2: (stage, kickoff) ESTE unic -> relabel pe loc, păstrând
//    id-urile documentelor (deci și pronosticurile atașate).
//  - Etapa 3: kickoff NU e unic în interiorul etapei -> ștergem documentele
//    existente și le recreăm din programul corect (nu există pronosticuri pe
//    etapa 3).
//
// Rulează cu DRY=1 (implicit) pentru simulare, sau DRY=0 pentru a aplica.
import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  writeBatch,
} from 'firebase/firestore'
import { readFileSync } from 'fs'

const DRY = process.env.DRY !== '0'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// ---- Parse programul corect din lib/wc2026-schedule.ts ----
const src = readFileSync('lib/wc2026-schedule.ts', 'utf8')

// grupele
const groups = {}
for (const m of src.matchAll(/const ([A-L]) = \[([^\]]+)\]/g)) {
  groups[m[1]] = m[2].split(',').map((t) => t.trim().replace(/^'|'$/g, ''))
}

// roToUtc — replică EXACT logica din lib/wc2026-schedule.ts
function roToUtc(local) {
  const d = new Date(local + ':00.000Z')
  d.setUTCHours(d.getUTCHours() - 3)
  return d.toISOString()
}

// RAW matches
const correct = []
const reRaw =
  /stage: (\d+),\s*homeTeam: ([A-L])\[(\d)\],\s*awayTeam: ([A-L])\[(\d)\],\s*kickoffRo: '([^']+)'/g
for (const m of src.matchAll(reRaw)) {
  const stage = Number(m[1])
  const home = groups[m[2]][Number(m[3])]
  const away = groups[m[4]][Number(m[5])]
  const kickoff = roToUtc(m[6])
  correct.push({ stage, homeTeam: home, awayTeam: away, kickoff })
}
console.log('Programul corect parsat:', correct.length, 'meciuri')
if (correct.length !== 72) {
  console.error('!! Numar gresit de meciuri parsate, opresc.')
  process.exit(1)
}

// verifică unicitatea (stage,kickoff) pe etapele 1 & 2
for (const st of [1, 2]) {
  const keys = correct
    .filter((c) => c.stage === st)
    .map((c) => c.kickoff)
  const uniq = new Set(keys)
  console.log(
    `Etapa ${st}: ${keys.length} meciuri, ${uniq.size} kickoff-uri unice`,
  )
  if (uniq.size !== keys.length) {
    console.error(`!! Etapa ${st} are kickoff-uri duplicate, opresc.`)
    process.exit(1)
  }
}

// ---- Citește meciurile existente din DB ----
const snap = await getDocs(collection(db, 'matches'))
const existing = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
console.log('Meciuri in DB:', existing.length)

// ---- Etapele 1 & 2: relabel pe loc ----
const batch = writeBatch(db)
let relabel = 0
for (const st of [1, 2]) {
  const correctByKo = new Map(
    correct.filter((c) => c.stage === st).map((c) => [c.kickoff, c]),
  )
  for (const m of existing.filter((x) => x.stage === st)) {
    const want = correctByKo.get(m.kickoff)
    if (!want) {
      console.warn(`  fara potrivire pt st${st} ${m.kickoff} (${m.id})`)
      continue
    }
    if (m.homeTeam !== want.homeTeam || m.awayTeam !== want.awayTeam) {
      console.log(
        `  [st${st}] ${m.homeTeam} vs ${m.awayTeam}  ->  ${want.homeTeam} vs ${want.awayTeam}`,
      )
      if (!DRY)
        batch.update(doc(db, 'matches', m.id), {
          homeTeam: want.homeTeam,
          awayTeam: want.awayTeam,
        })
      relabel++
    }
  }
}

// ---- Etapa 3: șterge tot și recreează ----
const stage3Existing = existing.filter((x) => x.stage === 3)
console.log(`\nEtapa 3: sterg ${stage3Existing.length} documente si recreez 24`)
if (!DRY) {
  for (const m of stage3Existing) batch.delete(doc(db, 'matches', m.id))
  for (const c of correct.filter((x) => x.stage === 3)) {
    batch.set(doc(collection(db, 'matches')), {
      stage: 3,
      homeTeam: c.homeTeam,
      awayTeam: c.awayTeam,
      kickoff: c.kickoff,
      homeScore: null,
      awayScore: null,
    })
  }
}

console.log(`\nRezumat: ${relabel} relabel (st1+st2), 24 recreate (st3)`)
if (DRY) {
  console.log('\n*** DRY RUN — nimic nu a fost scris. Ruleaza cu DRY=0 pentru a aplica. ***')
} else {
  await batch.commit()
  console.log('\n*** APLICAT cu succes. ***')
}
process.exit(0)
