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

const matchById = new Map()
for (const d of matchesSnap.docs) matchById.set(d.id, { id: d.id, ...d.data() })

// count predictions per matchId
const predByMatch = {}
for (const d of predsSnap.docs) {
  const p = d.data()
  predByMatch[p.matchId] = (predByMatch[p.matchId] || 0) + 1
}

console.log('matchId -> #preds -> stage / teams (or ORPHAN)')
for (const [mid, count] of Object.entries(predByMatch).sort(
  (a, b) => b[1] - a[1],
)) {
  const m = matchById.get(mid)
  if (m) {
    console.log(`${count}x  st${m.stage}  ${m.homeTeam} vs ${m.awayTeam}`)
  } else {
    console.log(`${count}x  ORPHAN matchId=${mid}`)
  }
}
process.exit(0)
