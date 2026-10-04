import Link from 'next/link'

export default function UnauthorizedPage() {
  return <section className="card"><p className="eyebrow">Accès refusé</p><h1>Ce compte n’a pas accès à cet espace</h1><p className="lede">Vérifiez l’invitation et le rôle de votre compte auprès de l’administrateur MédiHelm.</p><Link className="button" href="/login">Retour à la connexion</Link></section>
}
