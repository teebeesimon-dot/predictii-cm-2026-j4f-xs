import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const db = getFirestore(app)
const snap = await getDocs(collection(db, 'matches'))
for (const d of snap.docs) {
  const m = d.data()
  if ((m.editionId ?? 'wc-2026') === 'cl-2026' && m.stage >= 9) {
    console.log(`E${m.stage}: ${m.homeTeam}  vs  ${m.awayTeam}  @ ${m.kickoff}`)
  }
}
process.exit(0)
