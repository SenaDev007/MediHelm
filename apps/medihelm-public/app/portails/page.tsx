import type { Metadata } from 'next'
import Link from 'next/link'
import { PortalCard } from '@medihelm/ui'
import { Footer } from '../../components/layout/Footer'
import { Header } from '../../components/layout/Header'

export const dynamic = 'force-static'

export const metadata: Metadata = {
  title: 'Portails MédiHelm — Accédez à votre espace',
  description: 'Pharmaciens, grossistes et institutions : accédez à votre espace MédiHelm.',
  robots: { index: false },
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
const GROSSISTE_URL = process.env.NEXT_PUBLIC_GROSSISTE_URL ?? 'http://localhost:3002'
const INSTITUTIONNEL_URL = process.env.NEXT_PUBLIC_INSTITUTIONNEL_URL ?? 'http://localhost:3001/institutions'
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001/admin'
const LEGACY_WEB_URL = process.env.NEXT_PUBLIC_LEGACY_WEB_URL ?? 'http://localhost:3001'

function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '')
}

export default function PortailsPage() {
  return (
    <div className="public-shell">
      <Header />
      <main className="public-main">
        <section className="public-section" aria-labelledby="portal-heading">
          <p className="hero__eyebrow">Un écosystème · des espaces dédiés</p>
          <h1 id="portal-heading">Accédez à votre espace MédiHelm</h1>
          <p>Choisissez le portail correspondant à votre rôle. Les destinations peuvent être configurées séparément par environnement.</p>
          <div className="portal-grid">
            <PortalCard
              icon="🏥"
              title="Espace Pharmacien"
              subtitle="MédiHelm Pro"
              description="Backoffice pour la gestion de votre officine."
              features={['Stock & péremptions', 'Point de vente (POS)', 'RH & bulletins de paie', 'Finance & caisse', 'Commandes fournisseurs', 'ORION — intelligence métier']}
              href={APP_URL}
              displayUrl={displayUrl(APP_URL)}
              accent="teal"
            />
            <PortalCard
              icon="🏭"
              title="Espace Grossiste"
              subtitle="MédiHelm Grossiste"
              description="Espace partenaire pour les répartiteurs pharmaceutiques."
              features={['Catalogue & tarification', 'Commandes entrantes', 'Picking entrepôt', 'Livraisons & signature', 'Officines partenaires', 'Analytique des ventes']}
              href={GROSSISTE_URL}
              displayUrl={displayUrl(GROSSISTE_URL)}
              accent="amber"
            />
            <PortalCard
              icon="🏛"
              title="Espace Institutionnel"
              subtitle="DPMED · SoBAPS · ABRP"
              description="Accès institutionnel aux données réglementaires et agrégées."
              features={['Alertes DPMED & rappels lots', 'Score de conformité', 'Confirmations de livraisons SoBAPS', 'Pharmacovigilance', 'Registres réglementaires', 'Surveillance médicaments']}
              href={INSTITUTIONNEL_URL}
              displayUrl={displayUrl(INSTITUTIONNEL_URL)}
              accent="navy"
              badge="Accès sur invitation"
            />
            <PortalCard
              icon="⚙"
              title="Administration"
              subtitle="YEHI OR Tech"
              description="Supervision globale de la plateforme MédiHelm."
              features={['Gestion des officines', 'Plans & facturation', 'Supervision ORION', 'Journaux & audit', 'Utilisateurs & rôles', 'Infrastructure']}
              href={ADMIN_URL}
              displayUrl={displayUrl(ADMIN_URL)}
              accent="slate"
              badge="YEHI OR Tech uniquement"
            />
          </div>
          <aside className="patient-note">
            <strong>Vous êtes patient ?</strong> Aucun portail professionnel n’est nécessaire.{' '}
            <a href={`${LEGACY_WEB_URL.replace(/\/$/, '')}/patient/recherche`}>Rechercher un médicament sans inscription →</a>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  )
}
