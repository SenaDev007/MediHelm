import Link from 'next/link'

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
const grossisteUrl = process.env.NEXT_PUBLIC_GROSSISTE_URL ?? 'http://localhost:3002'
const institutionnelUrl = process.env.NEXT_PUBLIC_INSTITUTIONNEL_URL ?? 'http://localhost:3001/institutions'

export function Footer() {
  return (
    <footer className="public-footer">
      <div className="footer-content">
        <div>
          <strong>MÉDIHELM</strong>
          <p>L’infrastructure pharmaceutique numérique du Bénin.</p>
          <small>YEHI OR Tech · Bénin</small>
        </div>
        <nav className="footer-portals" aria-label="Espaces professionnels">
          <h2>Espaces professionnels</h2>
          <a href={appUrl}><span className="footer-dot footer-dot--teal" />Espace Pharmacien</a>
          <a href={grossisteUrl}><span className="footer-dot footer-dot--amber" />Espace Grossiste</a>
          <a href={institutionnelUrl}><span className="footer-dot footer-dot--navy" />DPMED · SoBAPS · ABRP</a>
          <Link href="/portails">Voir tous les portails →</Link>
        </nav>
      </div>
    </footer>
  )
}
