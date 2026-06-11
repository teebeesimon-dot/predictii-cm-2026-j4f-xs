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

const matchesSnap = await getDocs(collection(db, 'matches'))
const predsSnap = await getDocs(collection(db, 'predictions'))

const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

console.log('TOTAL matches:', matches.length)
console.log('TOTAL predictions:', predsSnap.size)

// how many matches have a score set (results entered)
const withScores = matches.filter(
  (m) => m.homeScore !== null && m.homeScore !== undefined,
)
console.log('matches with scores entered:', withScores.length)

// distribution of stages
const byStage = {}
for (const m of matches) byStage[m.stage] = (byStage[m.stage] || 0) + 1
console.log('matches per stage:', JSON.stringify(byStage))

// predictions per matchId (which matches have predictions)
const predByMatch = {}
for (const d of predsSnap.docs) {
  const p = d.data()
  predByMatch[p.matchId] = (predByMatch[p.matchId] || 0) + 1
}
console.log('distinct matches that have predictions:', Object.keys(predByMatch).length)
process.exit(0)
