'use client'

import { useEffect, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useAuth } from '@/components/auth-provider'
import { saveFcmToken } from '@/lib/data'

/**
 * Gestionează Firebase Cloud Messaging pe platformele native (Android/iOS prin
 * Capacitor). Nu randează nimic vizual.
 *
 * Flux:
 *  1. La pornire (doar pe nativ) verifică permisiunea de notificări; dacă e în
 *     starea „prompt", cere permisiunea (dialogul de sistem).
 *  2. Dacă e acordată, atașează listener-ele și apelează register(), care
 *     declanșează evenimentul „registration" cu tokenul FCM.
 *  3. Când avem și token, și utilizator autentificat, salvează tokenul în
 *     documentul acelui user din Firestore.
 *
 * Pe web (browser), Capacitor.isNativePlatform() e false, deci nu se execută
 * nimic — funcționalitatea existentă rămâne neatinsă.
 *
 * IMPORTANT (crash Android): PushNotifications.register() apelează FirebaseApp
 * nativ. Fără `google-services.json` în build, Firebase nativ nu se
 * inițializează și register() aruncă o excepție NATIVĂ fatală
 * („Default FirebaseApp is not initialized in this process"). De aceea
 * inițializarea e gardată de flag-ul NEXT_PUBLIC_PUSH_ENABLED: setează-l pe
 * 'true' DOAR după ce ai adăugat google-services.json real. Implicit, dacă
 * variabila lipsește, push-ul e ACTIV (fiindcă google-services.json este acum
 * configurat) — pune 'false' explicit ca să-l dezactivezi.
 */
// Push activ dacă variabila lipsește SAU e 'true'. Pune 'false' ca să dezactivezi.
const PUSH_ENABLED = process.env.NEXT_PUBLIC_PUSH_ENABLED !== 'false'

// Alerte vizibile pe dispozitiv pentru debugging (utile în WebView, unde consola
// nu se vede ușor). Pune 'true' ca să le activezi în timpul testării.
const DEBUG_PUSH = process.env.NEXT_PUBLIC_PUSH_DEBUG === 'true'

function dbg(msg: string) {
  console.log(`[v0] ${msg}`)
  // Alertele apar DOAR pe platformă nativă (app-ul Android/iOS), niciodată pe
  // web — ca să nu deranjeze utilizatorii din browser.
  if (
    DEBUG_PUSH &&
    typeof window !== 'undefined' &&
    Capacitor.isNativePlatform()
  ) {
    try {
      window.alert(`[PUSH] ${msg}`)
    } catch {
      // ignore
    }
  }
}

export function PushNotificationsProvider() {
  const { user } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    dbg(`useEffect intrat. native=${Capacitor.isNativePlatform()}`)

    if (initialized.current) return
    if (!Capacitor.isNativePlatform()) {
      dbg('Nu e platformă nativă (web) — push ignorat.')
      return
    }
    if (!PUSH_ENABLED) {
      dbg('Push DEZACTIVAT (NEXT_PUBLIC_PUSH_ENABLED=false). Se sare peste.')
      return
    }
    initialized.current = true

    const handles: Array<{ remove: () => void }> = []

    async function setup() {
      try {
        // 1. Permisiunea curentă.
        dbg('Înainte de checkPermissions()')
        let perm = await PushNotifications.checkPermissions()
        dbg(`După checkPermissions(): receive=${perm.receive}`)

        // Pe Android 13+ starea inițială e „prompt" → afișăm dialogul de sistem.
        if (
          perm.receive === 'prompt' ||
          perm.receive === 'prompt-with-rationale'
        ) {
          dbg('Înainte de requestPermissions()')
          perm = await PushNotifications.requestPermissions()
          dbg(`După requestPermissions(): receive=${perm.receive}`)
        }

        if (perm.receive !== 'granted') {
          dbg(`Permisiune neacordată (${perm.receive}). Nu apelez register().`)
          return
        }

        // 2. Atașăm listener-ele ÎNAINTE de register().
        handles.push(
          await PushNotifications.addListener('registration', (t) => {
            dbg(`Listener registration: token primit (len=${t.value.length})`)
            setToken(t.value)
          }),
        )
        handles.push(
          await PushNotifications.addListener('registrationError', (err) => {
            dbg(`Listener registrationError: ${JSON.stringify(err)}`)
          }),
        )
        handles.push(
          await PushNotifications.addListener(
            'pushNotificationReceived',
            (notification) => {
              dbg(`Notificare primită (foreground): ${notification.title}`)
            },
          ),
        )
        handles.push(
          await PushNotifications.addListener(
            'pushNotificationActionPerformed',
            (action) => {
              dbg(`Notificare apăsată: ${action.notification.title}`)
            },
          ),
        )

        // 3. Înregistrare la FCM → declanșează evenimentul „registration".
        dbg('Înainte de register()')
        await PushNotifications.register()
        dbg('register() apelat (aștept evenimentul registration).')
      } catch (e) {
        dbg(`Eroare setup push: ${(e as Error).message}`)
      }
    }

    void setup()

    return () => {
      handles.forEach((h) => h.remove())
    }
  }, [])

  // Salvăm tokenul în Firestore când avem și token, și user autentificat.
  useEffect(() => {
    if (!token || !user?.id) return
    dbg(`Salvez tokenul FCM pentru user ${user.id}`)
    saveFcmToken(user.id, token).catch((e) =>
      dbg(`Eroare salvare token FCM: ${(e as Error).message}`),
    )
  }, [token, user?.id])

  return null
}
