const legacyUrl = process.env.NEXT_PUBLIC_LEGACY_WEB_URL ?? 'http://localhost:3001'

export default function GrossisteHomePage() {
  const currentPortalUrl = `${legacyUrl.replace(/\/$/, '')}/grossistes`

  return (
    <>
      <header className="grossiste-header"><a href={process.env.NEXT_PUBLIC_PUBLIC_URL ?? 'http://localhost:3010'}>← medihelm.com</a></header>
      <main className="grossiste-main">
        <section className="grossiste-card" aria-labelledby="grossiste-title">
          <p>ESPACES PROFESSIONNELS · GROSSISTES RÉPARTITEURS</p>
          <h1 id="grossiste-title">MédiHelm Grossiste</h1>
          <p>Le portail grossiste possède désormais son workspace indépendant. Les modules métier, l’authentification partenaire et les échanges API sont transférés progressivement depuis l’application historique.</p>
          <a className="grossiste-link" href={currentPortalUrl}>Continuer sur le portail historique <span aria-hidden="true">→</span></a>
          <aside className="migration-note">Cet espace est en transition : le transfert des commandes, du catalogue, du picking et des livraisons vers l’API centrale n’est pas encore achevé.</aside>
        </section>
      </main>
    </>
  )
}
