import Link from 'next/link'

const institutionalUrl = process.env.NEXT_PUBLIC_INSTITUTIONNEL_URL ?? 'http://localhost:3004'
const pharmacyUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
const wholesalerUrl = process.env.NEXT_PUBLIC_GROSSISTE_URL ?? 'http://localhost:3002'

export default function ConnexionPage() {
  return <main className="public-main">
    <section className="public-card">
      <p className="public-eyebrow">Accès aux espaces sécurisés</p>
      <h1>Connexion à MédiHelm</h1>
      <p>Choisissez l’espace associé à votre compte. Les autorisations sont vérifiées par l’API à chaque opération.</p>
      <div className="public-actions">
        <Link className="public-button" href={`${institutionalUrl}/login`}>DPMED · SoBAPS</Link>
        <Link className="public-button secondary" href={`${pharmacyUrl}/login`}>Pharmacie</Link>
        <Link className="public-button secondary" href={`${wholesalerUrl}/login`}>Grossiste</Link>
      </div>
      <p className="public-note">Les comptes institutionnels sont nominatifs et créés sur invitation; aucun compte ne peut être auto-enregistré depuis cette page.</p>
    </section>
  </main>
}
