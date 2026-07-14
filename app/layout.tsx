import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import { Geist, Geist_Mono, Oswald } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import { EditionProvider } from '@/components/edition-provider'
import { PushNotificationsProvider } from '@/components/push-notifications-provider'
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

export const metadata: Metadata = {
  title: 'Predictii Just4Fun',
  description:
    'Jocul de predicții Just4Fun pentru marile competiții de fotbal: World Cup, Euro și Champions League. Pune pronosticuri, urmărește clasamentele și câștigă trofeul.',
  generator: 'v0.app',
  icons: {
    icon: '/j4f-icon.png',
    shortcut: '/j4f-icon.png',
    apple: '/j4f-icon.png',
  },
}

export const viewport = {
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
              <PushNotificationsProvider />
              {children}
            </AuthProvider>
          </EditionProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
