import type { Metadata } from 'next'
import Link from 'next/link'
import './globals.css'
import { InstitutionNav } from './components/institution-nav'
import { LogoutButton } from './components/logout-button'

export const metadata: Metadata = {
  title: 'MédiHelm Institutionnel',
  description: 'Portail institutionnel sécurisé DPMED, SoBAPS et ABRP.',
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <header className="topbar">
          <Link className="brand" href="/">MédiHelm <span>Institutionnel</span></Link>
          <InstitutionNav />
          <LogoutButton />
        </header>
        <main className="page-shell">{children}</main>
        <footer className="footer">Accès institutionnel · Données limitées au périmètre sanitaire autorisé</footer>
      </body>
    </html>
  )
}
