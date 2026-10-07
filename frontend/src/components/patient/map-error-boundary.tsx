'use client'

import { Component, type ReactNode } from 'react'
import { MapPin, RefreshCw } from 'lucide-react'

/**
 * Error boundary DÉDIÉ à la carte interactive (MapLibre).
 *
 * Pourquoi : la carte repose sur WebGL, dont l'initialisation peut
 * échouer ou le contexte être perdu sur appareils mobiles modestes
 * (GPU contraint, mode économie d'énergie, onglets en surnombre).
 * Sans boundary dédié, l'erreur remontait jusqu'au error.tsx RACINE
 * et remplaçait TOUTE la page par « Une erreur est survenue » — y
 * compris le panneau « pharmacies à proximité », pourtant indépendant.
 *
 * Avec ce boundary : seule la carte est remplacée par un fallback
 * sobre (message + bouton Réessayer), le reste de la page demeure
 * pleinement fonctionnel.
 */
interface MapErrorBoundaryProps {
  children: ReactNode
  /** Hauteur du fallback (recommandé : celle du conteneur carte) */
  fallbackHeight?: string
  /** Libellé du contexte (ex. « la carte des pharmacies ») */
  subject?: string
}

interface MapErrorBoundaryState {
  hasError: boolean
}

export class MapErrorBoundary extends Component<
  MapErrorBoundaryProps,
  MapErrorBoundaryState
> {
  constructor(props: MapErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): MapErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    // Diagnostic serveur-side impossible (client) — journaliser pour
    // le développeur via la console, sans crasher l'expérience.
    console.error('[MediHelm] Carte indisponible sur cet appareil :', error)
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="h-full w-full flex items-center justify-center bg-teal-50/60 rounded-2xl border border-teal-200/70 p-6 text-center"
          style={this.props.fallbackHeight ? { minHeight: this.props.fallbackHeight } : undefined}
        >
          <div className="max-w-xs">
            <div className="mx-auto mb-3 h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-amber-600" />
            </div>
            <p className="text-sm font-semibold text-teal-900">
              Carte momentanément indisponible
            </p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {this.props.subject ?? 'La carte interactive'} n&apos;a pas pu
              s&apos;afficher sur cet appareil. La liste des pharmacies reste
              accessible.
            </p>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#0F6E56]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Réessayer
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
