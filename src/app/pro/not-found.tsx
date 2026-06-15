import Link from 'next/link'

export default function ProNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-[#1D9E75] flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-[#085041] mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-2">Page non trouvée</h2>
        <p className="text-muted-foreground mb-6">
          Cette page de l&apos;espace professionnel n&apos;existe pas.
        </p>
        <Link
          href="/pro"
          className="inline-flex items-center gap-2 bg-[#1D9E75] hover:bg-[#085041] text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour au tableau de bord
        </Link>
      </div>
    </div>
  )
}
