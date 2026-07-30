import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, Oswald } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { EditionProvider } from '@/components/edition-provider'
import { PushNotificationsProvider } from '@/components/push-notifications-provider'
import { ThemeFavicon } from '@/components/theme-favicon'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})
const oswald = Oswald({
  variable: '--font-heading',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const siteDescription = 'Competiția ne adună.'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000',
  ),
  title: {
    default: 'SKUPA',
    template: 'SKUPA | %s',
  },
  applicationName: 'SKUPA',
  description: siteDescription,
  manifest: '/site.webmanifest',
  // Light = favicon_io (3), dark = favicon_io (4). Fără fișiere în app/
  // ca să nu override-uiască metadata media.
  icons: {
    icon: [
      {
        url: '/icons/light/favicon.ico',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icons/light/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icons/light/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icons/dark/favicon.ico',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icons/dark/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icons/dark/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icons/dark/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icons/dark/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/icons/light/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icons/dark/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
  },
  openGraph: {
    title: 'SKUPA',
    description: siteDescription,
    siteName: 'SKUPA',
    images: [
      {
        url: '/icons/dark/android-chrome-512x512.png',
        width: 512,
        height: 512,
        alt: 'SKUPA',
      },
    ],
    type: 'website',
    locale: 'ro_RO',
  },
  twitter: {
    card: 'summary',
    title: 'SKUPA',
    description: siteDescription,
    images: ['/icons/dark/android-chrome-512x512.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: 'SKUPA',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1f9d5a' },
    { media: '(prefers-color-scheme: dark)', color: '#0f2419' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="ro"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${oswald.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <EditionProvider>
            <AuthProvider>
              <ThemeFavicon />
              <PushNotificationsProvider />
              {children}
              <Toaster />
            </AuthProvider>
          </EditionProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
