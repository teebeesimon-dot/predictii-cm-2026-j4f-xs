import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const db = getFirestore(app)
const snap = await getDocs(collection(db, 'matches'))
const byEdition = {}
snap.forEach((d) => {
  const m = d.data()
  const ed = m.editionId ?? 'wc-2026'
  byEdition[ed] = byEdition[ed] || {}
  byEdition[ed][m.stage] = (byEdition[ed][m.stage] || 0) + 1
})
for (const [ed, stages] of Object.entries(byEdition)) {
  const ordered = Object.keys(stages)
    .map(Number)
    .sort((a, b) => a - b)
    .map((s) => `E${s}:${stages[s]}`)
    .join('  ')
  console.log(ed, '→', ordered)
}
process.exit(0)
