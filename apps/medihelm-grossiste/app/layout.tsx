import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MédiHelm Grossiste',
  description: 'Portail partenaire des répartiteurs pharmaceutiques MediHelm.',
  robots: { index: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
