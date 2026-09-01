'use client'

import { useEffect } from 'react'
import { useTheme } from 'next-themes'

export function ThemeFavicon() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const theme = resolvedTheme === 'light' ? 'light' : 'dark'
    const href = `/icons/${theme}/favicon.ico?v=${theme}`
    let link = document.querySelector<HTMLLinkElement>(
      'link[rel="icon"][data-skupa-theme]',
    )
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      link.setAttribute('data-skupa-theme', 'true')
      document.head.appendChild(link)
    }
    link.href = href
  }, [resolvedTheme])

  return null
}
