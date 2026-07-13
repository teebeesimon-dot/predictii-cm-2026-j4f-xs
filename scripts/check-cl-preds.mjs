import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const db = getFirestore(app)

// Set of cl-2026 match ids
const matchSnap = await getDocs(collection(db, 'matches'))
const clIds = new Set()
for (const d of matchSnap.docs) {
  if ((d.data().editionId ?? 'wc-2026') === 'cl-2026') clIds.add(d.id)
}
console.log('cl-2026 matches:', clIds.size)

const predSnap = await getDocs(collection(db, 'predictions'))
let onCl = 0
for (const d of predSnap.docs) {
  const p = d.data()
  if (clIds.has(p.matchId)) onCl++
}
console.log('predictions referencing cl-2026 matches:', onCl)
process.exit(0)
