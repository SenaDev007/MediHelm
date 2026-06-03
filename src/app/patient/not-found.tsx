import Link from 'next/link'

export default function PatientNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-[#1D9E75] flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h1 className="text-6xl font-bold text-[#085041] mb-2">404</h1>
        <h2 className="text-xl font-semibold mb-2">Page non trouvée</h2>
        <p className="text-muted-foreground mb-6">
          Cette page de l&apos;espace patient n&apos;existe pas.
        </p>
        <Link
          href="/patient"
          className="inline-flex items-center gap-2 bg-[#1D9E75] hover:bg-[#085041] text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Retour à l&apos;accueil patient
        </Link>
      </div>
    </div>
  )
}
