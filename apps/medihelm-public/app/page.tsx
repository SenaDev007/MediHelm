import Link from 'next/link'
import { Footer } from '../components/layout/Footer'
import { Header } from '../components/layout/Header'

const legacyUrl = process.env.NEXT_PUBLIC_LEGACY_WEB_URL ?? 'http://localhost:3001'

export default function HomePage() {
  return (
    <div className="public-shell">
      <Header />
      <main className="public-main">
        <section className="hero">
          <p className="hero__eyebrow">Santé · pharmacie · confiance</p>
          <h1>L’infrastructure pharmaceutique numérique du Bénin.</h1>
          <p>MédiHelm relie les patients, les officines, les grossistes répartiteurs et les institutions autour d’une chaîne pharmaceutique plus accessible et traçable.</p>
          <Link className="primary-link" href="/portails">Découvrir les espaces professionnels <span aria-hidden="true">→</span></Link>
        </section>
        <section className="public-section">
          <h2>Patients : trouvez votre médicament</h2>
          <p>La recherche patient reste disponible pendant la séparation progressive des applications.</p>
          <a className="primary-link" href={`${legacyUrl.replace(/\/$/, '')}/patient/recherche`}>Rechercher sans inscription <span aria-hidden="true">→</span></a>
        </section>
        <section className="public-section">
          <h2>Un point d’entrée, des espaces dédiés</h2>
          <p>Les portails professionnels sont séparés par profil. Choisissez l’espace correspondant à votre activité.</p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
