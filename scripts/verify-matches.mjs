import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'

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

function roToUtc(local) {
  const d = new Date(local + ':00.000Z')
  d.setUTCHours(d.getUTCHours() - 3)
  return d.toISOString()
}

// Parse schedule file into correct program
const src = readFileSync('lib/wc2026-schedule.ts', 'utf8')
const groups = {}
for (const m of src.matchAll(/^const ([A-L]) = \[([^\]]+)\]/gm)) {
  groups[m[1]] = m[2].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
}
const re =
  /stage: (\d+),\s*homeTeam: ([A-L])\[(\d)\],\s*awayTeam: ([A-L])\[(\d)\],\s*kickoffRo: '([^']+)'/g
const program = []
let mm
while ((mm = re.exec(src))) {
  program.push({
    stage: +mm[1],
    home: groups[mm[2]][+mm[3]],
    away: groups[mm[4]][+mm[5]],
    kickoff: roToUtc(mm[6]),
  })
}

const snap = await getDocs(collection(db, 'matches'))
const dbMatches = snap.docs.map((d) => ({ id: d.id, ...d.data() }))

console.log('Program file:', program.length, '| DB:', dbMatches.length)
for (const s of [1, 2, 3]) {
  console.log(
    `stage ${s}: program=${program.filter((x) => x.stage === s).length} db=${dbMatches.filter((x) => x.stage === s).length}`,
  )
}

// Compare as multiset of "stage|sortedTeams|kickoff"
const key = (m) =>
  `${m.stage}|${[m.home ?? m.homeTeam, m.away ?? m.awayTeam].sort().join('+')}|${m.kickoff}`
const progSet = new Map()
for (const p of program) progSet.set(key(p), (progSet.get(key(p)) ?? 0) + 1)
const dbSet = new Map()
for (const d of dbMatches) dbSet.set(key(d), (dbSet.get(key(d)) ?? 0) + 1)

const missing = []
const extra = []
for (const [k, c] of progSet) {
  const dc = dbSet.get(k) ?? 0
  if (dc < c) missing.push(`${k} (program x${c}, db x${dc})`)
}
for (const [k, c] of dbSet) {
  const pc = progSet.get(k) ?? 0
  if (c > pc) extra.push(`${k} (db x${c}, program x${pc})`)
}

console.log('\nMISSING from DB (in program, not matched):', missing.length)
missing.forEach((x) => console.log('  -', x))
console.log('\nEXTRA in DB (not in program):', extra.length)
extra.forEach((x) => console.log('  +', x))
if (missing.length === 0 && extra.length === 0) {
  console.log('\n*** DB corespunde EXACT programului oficial. ***')
}
process.exit(0)
