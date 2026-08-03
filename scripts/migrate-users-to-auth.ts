/**
 * Migrare utilizatori Firestore → Firebase Authentication (Admin SDK).
 *
 * Implicit: DRY RUN — citește Firestore, validează, afișează raport.
 * Nu creează conturi Auth și nu modifică Firestore.
 *
 * Executare reală (etapă ulterioară):
 *   pnpm migrate:users-to-auth -- --execute
 *   MIGRATION_EXECUTE=true pnpm migrate:users-to-auth
 *
 * În Etapa 2, helper-ele de mutație (createAuthUser / setClaims / linkFirestore)
 * sunt pregătite dar NU sunt apelate. --execute este recunoscut și respins
 * intenționat până la activarea migrării reale.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth, type Auth } from 'firebase-admin/auth'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { loadFirebaseServiceAccount } from '../lib/firebase-admin-credentials'
import { isValidEmail, normalizeEmail } from '../lib/email'

// ---------------------------------------------------------------------------
// Env
// ---------------------------------------------------------------------------

function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

function loadProjectEnv(): void {
  const root = resolve(process.cwd())
  loadEnvFile(resolve(root, '.env.local'))
  loadEnvFile(resolve(root, '.env'))
}

function wantsExecute(argv: string[]): boolean {
  if (argv.includes('--execute') || argv.includes('-x')) return true
  const flag = process.env.MIGRATION_EXECUTE?.trim().toLowerCase()
  return flag === 'true' || flag === '1' || flag === 'yes'
}

// ---------------------------------------------------------------------------
// Admin SDK (standalone — nu folosește lib/firebase-admin.ts / server-only)
// ---------------------------------------------------------------------------

interface AdminClients {
  app: App
  db: Firestore
  auth: Auth
}

function initAdmin(): AdminClients {
  const existing = getApps()
  const app =
    existing.length > 0
      ? existing[0]
      : initializeApp({
          credential: cert(loadFirebaseServiceAccount()),
        })

  return {
    app,
    db: getFirestore(app),
    auth: getAuth(app),
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FirestoreUser {
  id: string
  username: string
  name: string
  password?: string
  email?: string
  authUid?: string
  isAdmin?: boolean
  role?: string
}

interface MigrationReport {
  totalUsers: number
  usersWithoutEmail: string[]
  duplicateEmails: { email: string; userIds: string[] }[]
  duplicateUsernames: { username: string; userIds: string[] }[]
  invalidEmails: { userId: string; username: string; email: string }[]
  alreadyMigrated: string[]
  readyToMigrate: string[]
  usersWithoutPassword: string[]
  adminUsers: string[]
  blockingErrors: string[]
}

// ---------------------------------------------------------------------------
// Analysis (read-only)
// ---------------------------------------------------------------------------

function isAdminUser(u: FirestoreUser): boolean {
  return u.isAdmin === true || u.role === 'admin'
}

function hasPassword(u: FirestoreUser): boolean {
  return typeof u.password === 'string' && u.password.length > 0
}

function analyzeUsers(users: FirestoreUser[]): MigrationReport {
  const usersWithoutEmail: string[] = []
  const invalidEmails: MigrationReport['invalidEmails'] = []
  const alreadyMigrated: string[] = []
  const readyToMigrate: string[] = []
  const usersWithoutPassword: string[] = []
  const adminUsers: string[] = []

  const emailMap = new Map<string, string[]>()
  const usernameMap = new Map<string, string[]>()

  for (const u of users) {
    const label = `${u.id} (@${u.username || '?'})`

    if (isAdminUser(u)) adminUsers.push(label)
    if (!hasPassword(u)) usersWithoutPassword.push(label)

    const username = (u.username ?? '').trim().toLowerCase()
    if (username) {
      const list = usernameMap.get(username) ?? []
      list.push(u.id)
      usernameMap.set(username, list)
    }

    if (u.authUid) {
      alreadyMigrated.push(label)
    }

    const rawEmail = (u.email ?? '').trim()
    if (!rawEmail) {
      usersWithoutEmail.push(label)
      continue
    }

    if (!isValidEmail(rawEmail)) {
      invalidEmails.push({
        userId: u.id,
        username: u.username || '?',
        email: rawEmail,
      })
      continue
    }

    const email = normalizeEmail(rawEmail)
    const emailList = emailMap.get(email) ?? []
    emailList.push(u.id)
    emailMap.set(email, emailList)
  }

  const duplicateEmails = [...emailMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([email, userIds]) => ({ email, userIds }))

  const duplicateUsernames = [...usernameMap.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([username, userIds]) => ({ username, userIds }))

  const duplicateEmailIds = new Set(
    duplicateEmails.flatMap((d) => d.userIds),
  )
  const duplicateUsernameIds = new Set(
    duplicateUsernames.flatMap((d) => d.userIds),
  )
  const invalidEmailIds = new Set(invalidEmails.map((e) => e.userId))

  for (const u of users) {
    if (u.authUid) continue
    const rawEmail = (u.email ?? '').trim()
    if (!rawEmail || !isValidEmail(rawEmail)) continue
    if (!hasPassword(u)) continue
    if (duplicateEmailIds.has(u.id)) continue
    if (duplicateUsernameIds.has(u.id)) continue
    if (invalidEmailIds.has(u.id)) continue
    readyToMigrate.push(`${u.id} (@${u.username || '?'})`)
  }

  const blockingErrors: string[] = []
  if (duplicateEmails.length > 0) {
    blockingErrors.push(
      `Email duplicat: ${duplicateEmails.length} valoare(i) partajată(e).`,
    )
  }
  if (duplicateUsernames.length > 0) {
    blockingErrors.push(
      `Username duplicat: ${duplicateUsernames.length} valoare(i) partajată(e).`,
    )
  }
  if (invalidEmails.length > 0) {
    blockingErrors.push(
      `Email invalid: ${invalidEmails.length} utilizator(i).`,
    )
  }

  return {
    totalUsers: users.length,
    usersWithoutEmail,
    duplicateEmails,
    duplicateUsernames,
    invalidEmails,
    alreadyMigrated,
    readyToMigrate,
    usersWithoutPassword,
    adminUsers,
    blockingErrors,
  }
}

function printReport(report: MigrationReport, mode: 'dry-run' | 'execute'): void {
  const line = (title: string, value: string | number) => {
    console.log(`${title.padEnd(28)} ${value}`)
  }

  console.log('')
  console.log('========== Migrare Auth — raport ==========')
  console.log(`Mode:                        ${mode}`)
  console.log('')
  line('Total users', report.totalUsers)
  line('Users fără email', report.usersWithoutEmail.length)
  line('Email duplicat', report.duplicateEmails.length)
  line('Username duplicat', report.duplicateUsernames.length)
  line('Email invalid', report.invalidEmails.length)
  line('Users deja migrați', report.alreadyMigrated.length)
  line('Users pregătiți migrare', report.readyToMigrate.length)
  line('Users fără parolă', report.usersWithoutPassword.length)
  line('Users admin', report.adminUsers.length)
  console.log('')

  if (report.usersWithoutEmail.length) {
    console.log('— Fără email —')
    for (const u of report.usersWithoutEmail) console.log(`  ${u}`)
    console.log('')
  }
  if (report.duplicateEmails.length) {
    console.log('— Email duplicat —')
    for (const d of report.duplicateEmails) {
      console.log(`  ${d.email} → ${d.userIds.join(', ')}`)
    }
    console.log('')
  }
  if (report.duplicateUsernames.length) {
    console.log('— Username duplicat —')
    for (const d of report.duplicateUsernames) {
      console.log(`  ${d.username} → ${d.userIds.join(', ')}`)
    }
    console.log('')
  }
  if (report.invalidEmails.length) {
    console.log('— Email invalid —')
    for (const e of report.invalidEmails) {
      console.log(`  ${e.userId} (@${e.username}): ${e.email}`)
    }
    console.log('')
  }
  if (report.alreadyMigrated.length) {
    console.log('— Deja migrați —')
    for (const u of report.alreadyMigrated) console.log(`  ${u}`)
    console.log('')
  }
  if (report.readyToMigrate.length) {
    console.log('— Pregătiți pentru migrare —')
    for (const u of report.readyToMigrate) console.log(`  ${u}`)
    console.log('')
  }
  if (report.usersWithoutPassword.length) {
    console.log('— Fără parolă —')
    for (const u of report.usersWithoutPassword) console.log(`  ${u}`)
    console.log('')
  }
  if (report.adminUsers.length) {
    console.log('— Admin —')
    for (const u of report.adminUsers) console.log(`  ${u}`)
    console.log('')
  }

  if (report.blockingErrors.length) {
    console.log('⚠ Blocaje (migrarea reală trebuie oprită):')
    for (const err of report.blockingErrors) console.log(`  - ${err}`)
    console.log('')
  } else {
    console.log('✓ Niciun blocaj de tip email/username duplicat sau email invalid.')
    console.log('')
  }
}

// ---------------------------------------------------------------------------
// Mutation helpers — pregătite pentru o etapă ulterioară. NU sunt apelate aici.
// ---------------------------------------------------------------------------

/** Pregătit pentru etapa de migrare reală — nu este apelat în Etapa 2. */
export async function createAuthUser(
  auth: Auth,
  user: FirestoreUser,
): Promise<{ uid: string }> {
  const email = normalizeEmail(user.email ?? '')
  if (!isValidEmail(email)) {
    throw new Error(`Email invalid pentru ${user.id}`)
  }
  if (!hasPassword(user)) {
    throw new Error(`Parolă lipsă pentru ${user.id}`)
  }

  const existing = await auth.getUserByEmail(email).catch(() => null)
  if (existing) {
    throw new Error(
      `Cont Auth există deja pentru ${email} (uid=${existing.uid}). Nu se creează duplicat.`,
    )
  }

  const created = await auth.createUser({
    email,
    password: user.password,
    displayName: user.name || user.username,
    emailVerified: false,
    disabled: false,
  })
  return { uid: created.uid }
}

/** Pregătit pentru etapa de migrare reală — nu este apelat în Etapa 2. */
export async function setClaims(
  auth: Auth,
  authUid: string,
  user: FirestoreUser,
): Promise<void> {
  await auth.setCustomUserClaims(authUid, {
    firestoreUserId: user.id,
    admin: isAdminUser(user),
  })
}

/** Pregătit pentru etapa de migrare reală — nu este apelat în Etapa 2. */
export async function linkFirestore(
  db: Firestore,
  user: FirestoreUser,
  authUid: string,
): Promise<void> {
  const email = normalizeEmail(user.email ?? '')
  await db.collection('users').doc(user.id).update({
    authUid,
    email,
    authProviders: ['password'],
    migratedAt: Date.now(),
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function loadUsers(db: Firestore): Promise<FirestoreUser[]> {
  const snap = await db.collection('users').get()
  return snap.docs.map((docSnap) => {
    const data = docSnap.data()
    return {
      id: docSnap.id,
      username: String(data.username ?? ''),
      name: String(data.name ?? ''),
      password: typeof data.password === 'string' ? data.password : undefined,
      email: typeof data.email === 'string' ? data.email : undefined,
      authUid: typeof data.authUid === 'string' ? data.authUid : undefined,
      isAdmin: data.isAdmin === true,
      role: typeof data.role === 'string' ? data.role : undefined,
    }
  })
}

async function main(): Promise<void> {
  loadProjectEnv()

  const execute = wantsExecute(process.argv.slice(2))
  const mode = execute ? 'execute' : 'dry-run'

  console.log('[migrate-users-to-auth] Pornire…')
  console.log(`[migrate-users-to-auth] Mod: ${mode}`)

  if (execute) {
    console.error('')
    console.error(
      '[migrate-users-to-auth] EXECUTE a fost cerut (--execute / MIGRATION_EXECUTE),',
    )
    console.error(
      'dar crearea de conturi Auth și scrierea în Firestore sunt dezactivate în Etapa 2.',
    )
    console.error(
      'Rulează fără --execute pentru dry-run. Migrarea reală urmează într-o etapă ulterioară.',
    )
    console.error('')
    process.exitCode = 2
    return
  }

  const { db } = initAdmin()
  const users = await loadUsers(db)
  const report = analyzeUsers(users)
  printReport(report, 'dry-run')

  if (report.blockingErrors.length > 0) {
    console.log(
      '[migrate-users-to-auth] Dry-run încheiat cu blocaje. Rezolvă-le înainte de migrarea reală.',
    )
    process.exitCode = 1
    return
  }

  console.log(
    '[migrate-users-to-auth] Dry-run OK. Nicio modificare Auth/Firestore. Pentru migrare reală (etapă ulterioară): --execute',
  )
}

main().catch((err) => {
  console.error('[migrate-users-to-auth] Eroare:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
