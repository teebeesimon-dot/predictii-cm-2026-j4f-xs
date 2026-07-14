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
 * nativ. Dacă `google-services.json` NU e prezent în build, Firebase nativ nu se
 * inițializează și register() arunca o excepție NATIVĂ fatală
 * („Default FirebaseApp is not initialized in this process") care închide
 * aplicația la pornire — un try/catch în JS NU o poate prinde.
 *
 * De aceea inițializarea e blocată în spatele unui flag și rulează DOAR când:
 *   NEXT_PUBLIC_PUSH_ENABLED === 'true'
 * Setează acest env var pe 'true' DOAR DUPĂ ce ai adăugat `google-services.json`
 * real în `android/app/` și ai făcut rebuild la APK. Până atunci push-ul e
 * dezactivat, iar aplicația pornește normal.
 */
const PUSH_ENABLED = process.env.NEXT_PUBLIC_PUSH_ENABLED === 'true'

export function PushNotificationsProvider() {
  const { user } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const initialized = useRef(false)

  // Setup o singură dată, doar pe platformă nativă ȘI doar dacă Firebase e
  // configurat (flag activat). Altfel register() ar face crash nativ.
  useEffect(() => {
    if (initialized.current) return
    if (!Capacitor.isNativePlatform()) return
    if (!PUSH_ENABLED) {
      console.log(
        '[v0] Push dezactivat (NEXT_PUBLIC_PUSH_ENABLED != true). ' +
          'Se sare peste register() ca sa nu crape fara google-services.json.',
      )
      return
    }
    initialized.current = true

    const handles: Array<{ remove: () => void }> = []

    async function setup() {
      try {
        // 1. Permisiunea curentă; dacă e „prompt", afișează dialogul de sistem.
        let perm = await PushNotifications.checkPermissions()
        if (
          perm.receive === 'prompt' ||
          perm.receive === 'prompt-with-rationale'
        ) {
          perm = await PushNotifications.requestPermissions()
        }
        if (perm.receive !== 'granted') {
          console.log('[v0] Permisiune notificări neacordată:', perm.receive)
          return
        }

        // 2. Atașăm listener-ele ÎNAINTE de register().
        handles.push(
          await PushNotifications.addListener('registration', (t) => {
            console.log('[v0] Token FCM primit')
            setToken(t.value)
          }),
        )
        handles.push(
          await PushNotifications.addListener('registrationError', (err) => {
            console.log('[v0] Eroare înregistrare push:', JSON.stringify(err))
          }),
        )
        handles.push(
          await PushNotifications.addListener(
            'pushNotificationReceived',
            (notification) => {
              console.log(
                '[v0] Notificare primită (foreground):',
                notification.title,
              )
            },
          ),
        )
        handles.push(
          await PushNotifications.addListener(
            'pushNotificationActionPerformed',
            (action) => {
              console.log(
                '[v0] Notificare apăsată:',
                action.notification.title,
              )
            },
          ),
        )

        // 3. Înregistrare la FCM → declanșează evenimentul „registration".
        await PushNotifications.register()
      } catch (e) {
        console.log('[v0] Eroare setup push:', (e as Error).message)
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
    saveFcmToken(user.id, token).catch((e) =>
      console.log('[v0] Eroare salvare token FCM:', (e as Error).message),
    )
  }, [token, user?.id])

  return null
}
