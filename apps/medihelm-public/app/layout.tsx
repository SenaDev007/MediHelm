import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MédiHelm — L’infrastructure pharmaceutique numérique du Bénin',
  description: 'Le hub MédiHelm relie patients, pharmacies, grossistes et institutions pharmaceutiques.',
  authors: [{ name: 'YEHI OR Tech' }],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
