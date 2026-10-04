import Link from 'next/link'
import { Building2 } from 'lucide-react'

const legacyUrl = process.env.NEXT_PUBLIC_LEGACY_WEB_URL ?? 'http://localhost:3001'

export function Header() {
  return (
    <header className="public-header">
      <Link className="brand" href="/">MÉDIHELM</Link>
      <nav className="desktop-nav" aria-label="Navigation principale">
        <a href={`${legacyUrl.replace(/\/$/, '')}/patient/recherche`}>Rechercher</a>
        <a href={`${legacyUrl.replace(/\/$/, '')}/patient/garde`}>Pharmacies de garde</a>
        <span className="nav-separator" aria-hidden="true" />
        <Link className="professional-link" href="/portails"><Building2 aria-hidden="true" /> Espace pro</Link>
      </nav>
      <details className="mobile-nav">
        <summary aria-label="Ouvrir le menu">Menu</summary>
        <nav aria-label="Menu mobile">
          <a href={`${legacyUrl.replace(/\/$/, '')}/patient/recherche`}>Rechercher</a>
          <a href={`${legacyUrl.replace(/\/$/, '')}/patient/garde`}>Pharmacies de garde</a>
          <Link href="/portails"><Building2 aria-hidden="true" /> Espace professionnel</Link>
        </nav>
      </details>
    </header>
  )
}
