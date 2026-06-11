import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

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

const snap = await getDocs(collection(db, 'matches'))
const matches = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
matches.sort((a, b) => String(a.kickoff).localeCompare(String(b.kickoff)))

console.log('TOTAL matches:', matches.length)
for (const stage of [1, 2, 3]) {
  console.log(`---- stage ${stage} ----`)
  for (const m of matches.filter((x) => x.stage === stage)) {
    console.log(`${m.kickoff}  ${m.homeTeam}  vs  ${m.awayTeam}`)
  }
}
process.exit(0)
