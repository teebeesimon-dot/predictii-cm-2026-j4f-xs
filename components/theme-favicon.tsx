'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

/**
 * Sincronizează favicon-ul din tab cu tema aplicației (next-themes),
 * nu doar cu prefers-color-scheme al OS-ului.
 */
export function ThemeFavicon() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const theme = resolvedTheme === 'light' ? 'light' : 'dark'
    const href = `/icons/${theme}/favicon.ico`

    let link = document.querySelector<HTMLLinkElement>(
      'link[rel="icon"][data-skupa-theme]',
    )
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      link.setAttribute('data-skupa-theme', 'true')
      document.head.appendChild(link)
    }
    // Cache-bust la schimbarea temei ca browserul să nu țină vechiul ico.
    link.href = `${href}?v=${theme}`
  }, [resolvedTheme])

  return null
}
