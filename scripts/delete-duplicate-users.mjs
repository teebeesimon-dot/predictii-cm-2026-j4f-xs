import { initializeApp } from 'firebase/app'
import {
  getFirestore,
  collection,
  getDocs,
  deleteDoc,
  doc,
} from 'firebase/firestore'

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

const norm = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

async function main() {
  const [usersSnap, predsSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'predictions')),
  ])

  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const preds = predsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const predCount = new Map()
  for (const p of preds) predCount.set(p.userId, (predCount.get(p.userId) ?? 0) + 1)

  // Grupează după nume normalizat.
  const byName = new Map()
  for (const u of users) {
    const key = norm(u.name) || u.username
    const arr = byName.get(key) ?? []
    arr.push(u)
    byName.set(key, arr)
  }

  // Pentru fiecare grup cu duplicate, șterge DOAR conturile cu 0 pronosticuri,
  // și numai dacă există în grup măcar un alt cont cu pronosticuri (originalul
  // pe care îl păstrăm). Niciodată nu ștergem un cont cu pronosticuri.
  const toDelete = []
  for (const [, arr] of byName) {
    if (arr.length < 2) continue
    const withPreds = arr.filter((u) => (predCount.get(u.id) ?? 0) > 0)
    if (withPreds.length === 0) continue // grup ambiguu → nu atingem nimic
    for (const u of arr) {
      if ((predCount.get(u.id) ?? 0) === 0) {
        toDelete.push(u)
      }
    }
  }

  console.log(`Conturi de șters (duplicate cu 0 pronosticuri): ${toDelete.length}`)
  for (const u of toDelete) {
    console.log(`  - id=${u.id} username=${u.username} name="${u.name}"`)
  }

  for (const u of toDelete) {
    await deleteDoc(doc(db, 'users', u.id))
  }

  console.log(`\nȘterse: ${toDelete.length} conturi duplicate.`)
  console.log(`Utilizatori rămași: ${users.length - toDelete.length}`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
