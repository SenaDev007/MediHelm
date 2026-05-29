'use client'

import { AlertTriangle, FileText } from 'lucide-react'
import { AlertForm } from '@/components/institutions/alert-form'

export default function NouvelleAlertePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Nouvelle alerte DPMED
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Créez et publiez une nouvelle alerte sanitaire pour diffusion à l&apos;ensemble du réseau MédiHelm
        </p>
      </div>

      {/* Warning banner */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-red-800">Attention — Diffusion institutionnelle</h3>
          <p className="text-xs text-red-700 mt-1">
            Toute alerte publiée sera diffusée immédiatement à l&apos;ensemble des pharmacies connectées.
            Vérifiez l&apos;exactitude des informations avant publication.
            La signature numérique engage la responsabilité de la DPMED.
          </p>
        </div>
      </div>

      {/* Form */}
      <AlertForm mode="create" />
    </div>
  )
}
