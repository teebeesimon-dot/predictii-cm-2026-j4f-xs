import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const db = getFirestore(app)
const snap = await getDocs(collection(db, 'matches'))
const s1 = []
for (const d of snap.docs) {
  const m = d.data()
  if ((m.editionId ?? 'wc-2026') === 'cl-2026' && m.stage === 1) {
    s1.push({ id: d.id, h: m.homeTeam, a: m.awayTeam, k: m.kickoff })
  }
}
console.log('Stage 1 CL count:', s1.length)
// detect duplicate pairs
const seen = {}
let dups = 0
for (const m of s1) {
  const key = [m.h, m.a].sort().join(' vs ')
  seen[key] = (seen[key] || 0) + 1
  if (seen[key] > 1) dups++
}
console.log('duplicate-pair rows:', dups)
console.log('sample kickoffs:', s1.slice(0, 5).map((m) => `${m.h}-${m.a} @ ${m.k}`))
// kickoff date range
const dates = s1.map((m) => m.k).filter(Boolean).sort()
console.log('kickoff range:', dates[0], '→', dates[dates.length - 1])
process.exit(0)
