import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cactus 🌵 — SEA Cultural Localization',
  description: 'Where global brands become local. Adapt your content for Singapore, Malaysia, and Indonesia.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #374151', background: '#030712', display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/" style={{ color: '#4ade80', fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>🌵 Cactus</a>
          <a href="/" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Localize</a>
          <a href="/captions" style={{ color: '#9ca3af', textDecoration: 'none', fontSize: '0.875rem' }}>Captions 🎬</a>
        </nav>
        {children}
      </body>
    </html>
  )
}
