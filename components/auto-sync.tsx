'use client'

import { useEffect, useRef } from 'react'
import { useSWRConfig } from 'swr'
import { useMatches } from '@/lib/hooks'
import { triggerSync } from '@/app/actions/sync'

// Cât de des încercăm o sincronizare cât timp aplicația e deschisă.
const POLL_INTERVAL_MS = 10 * 60 * 1000 // 10 minute
// Considerăm un meci „în fereastră activă" din 5 min înainte de start până la
// 3 ore după (acoperă prelungiri/penalty-uri și întârzieri de raportare).
const PRE_KICKOFF_MS = 5 * 60 * 1000
const POST_KICKOFF_MS = 3 * 60 * 60 * 1000

// Componentă invizibilă: rulează doar logica de polling. O montăm o singură
// dată în AppShell, deci pollează indiferent pe ce pagină se află userul.
//
// De ce e gratuit și sigur:
//  - pollează DOAR în ferestrele cu meciuri (nimic în zilele/orele fără meci);
//  - apelul real către API e throttled pe server (lib/actions), deci mai mulți
//    useri deschiși simultan NU înmulțesc cererile către football-data.org.
export function AutoSync() {
  const { data: matches } = useMatches()
  const { mutate } = useSWRConfig()
  const runningRef = useRef(false)
  const caughtUpRef = useRef(false)

  useEffect(() => {
    if (!matches || matches.length === 0) return

    // Suntem într-o fereastră activă de meci?
    function inMatchWindow(): boolean {
      const now = Date.now()
      return (matches ?? []).some((m) => {
        const k = new Date(m.kickoff).getTime()
        if (Number.isNaN(k)) return false
        return now >= k - PRE_KICKOFF_MS && now <= k + POST_KICKOFF_MS
      })
    }

    // Rulează o sincronizare și reîmprospătează datele dacă s-au schimbat scoruri.
    async function runSync(includeLive: boolean) {
      if (runningRef.current) return
      runningRef.current = true
      try {
        const res = await triggerSync({ includeLive })
        if (res.ran && res.result && res.result.updated > 0) {
          // Reîmprospătăm toate cheile (meciuri, clasamente, statistici, premii).
          await mutate(() => true, undefined, { revalidate: true })
        }
      } catch {
        // Eșec silențios: pollerul va reîncerca la următorul interval.
      } finally {
        runningRef.current = false
      }
    }

    // Sincronizare de RECUPERARE la deschiderea aplicației: rulează O DATĂ,
    // indiferent dacă suntem într-o fereastră de meci, ca utilizatorul care
    // tocmai a deschis aplicația să prindă scorurile meciurilor încheiate când
    // nimeni nu era online (ex. meciuri de noapte). E sigur pentru cota API:
    // apelul real e throttled server-side (MIN_INTERVAL_MS), deci dacă altcineva
    // a sincronizat recent, nu mai lovește furnizorul.
    if (!caughtUpRef.current) {
      caughtUpRef.current = true
      void runSync(true)
    }

    // Polling periodic doar în ferestrele cu meciuri (economisește cota API).
    function maybeSync() {
      if (!inMatchWindow()) return
      void runSync(true)
    }
    const id = setInterval(maybeSync, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [matches, mutate])

  return null
}
