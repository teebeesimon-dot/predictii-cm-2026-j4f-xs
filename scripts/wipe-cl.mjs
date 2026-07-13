import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore'

const app = initializeApp({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
})
const db = getFirestore(app)
const snap = await getDocs(collection(db, 'matches'))
const ids = []
for (const d of snap.docs) {
  if ((d.data().editionId ?? 'wc-2026') === 'cl-2026') ids.push(d.id)
}
console.log('Deleting', ids.length, 'cl-2026 matches...')
for (const id of ids) {
  await deleteDoc(doc(db, 'matches', id))
}
console.log('Done. Deleted', ids.length)
process.exit(0)
