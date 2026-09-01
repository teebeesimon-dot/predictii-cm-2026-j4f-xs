'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

type BrandLogoProps = {
  size?: 'nav' | 'hero'
  className?: string
  alt?: string
}

export function BrandLogo({
  size = 'nav',
  className,
  alt = 'SKUPA',
}: BrandLogoProps) {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const theme = mounted && resolvedTheme === 'light' ? 'light' : 'dark'
  const file =
    size === 'hero'
      ? 'android-chrome-512x512.png'
      : 'android-chrome-192x192.png'

  return (
    <img
      src={`/icons/${theme}/${file}`}
      alt={alt}
      className={cn(
        size === 'hero'
          ? 'mb-2 h-40 w-auto object-contain drop-shadow-lg sm:h-48'
          : 'h-9 w-auto shrink-0 object-contain lg:h-11',
        className,
      )}
    />
  )
}
