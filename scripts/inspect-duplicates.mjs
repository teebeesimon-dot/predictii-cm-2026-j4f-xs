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

const norm = (s) =>
  (s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const pairKey = (a, b, stage) =>
  [norm(a), norm(b)].sort().join('::') + '#' + stage

async function main() {
  const [usersSnap, predsSnap, matchesSnap] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'predictions')),
    getDocs(collection(db, 'matches')),
  ])

  const users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const preds = predsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const matches = matchesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  const predCount = new Map()
  for (const p of preds) predCount.set(p.userId, (predCount.get(p.userId) ?? 0) + 1)

  console.log(`\n=== USERS: ${users.length} total ===`)
  const byUname = new Map()
  for (const u of users) {
    const key = norm(u.name) || u.username
    const arr = byUname.get(key) ?? []
    arr.push(u)
    byUname.set(key, arr)
  }
  let dupUsers = 0
  for (const [key, arr] of byUname) {
    if (arr.length > 1) {
      dupUsers += arr.length - 1
      console.log(`\nDUPLICAT "${key}" (${arr.length}):`)
      for (const u of arr) {
        console.log(
          `  id=${u.id} username=${u.username} name="${u.name}" preds=${predCount.get(u.id) ?? 0} admin=${!!u.isAdmin} createdAt=${u.createdAt}`,
        )
      }
    }
  }
  console.log(`\n>>> Utilizatori duplicați (peste primul): ${dupUsers}`)

  console.log(`\n=== MATCHES: ${matches.length} total ===`)
  const byMatch = new Map()
  for (const m of matches) {
    const key = pairKey(m.homeTeam, m.awayTeam, m.stage)
    const arr = byMatch.get(key) ?? []
    arr.push(m)
    byMatch.set(key, arr)
  }
  let dupMatches = 0
  for (const [key, arr] of byMatch) {
    if (arr.length > 1) {
      dupMatches += arr.length - 1
      console.log(`\nMECI DUPLICAT "${key}" (${arr.length}):`)
      for (const m of arr) {
        const mp = preds.filter((p) => p.matchId === m.id).length
        console.log(
          `  id=${m.id} ${m.homeTeam} vs ${m.awayTeam} stage=${m.stage} kickoff=${m.kickoff} score=${m.homeScore}-${m.awayScore} preds=${mp}`,
        )
      }
    }
  }
  console.log(`\n>>> Meciuri duplicate (peste primul): ${dupMatches}`)
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
