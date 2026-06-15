'use client'

import { AlertForm } from '@/components/institutions/alert-form'
import { FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function NouvelleAlertePage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
          <FileText className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-teal-800">Nouvelle alerte DPMED</h1>
          <p className="text-sm text-muted-foreground">Créer et diffuser une alerte sanitaire</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-teal-200 bg-teal-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-teal-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-teal-800">Formulaire d&apos;alerte DPMED</p>
              <p className="text-xs text-muted-foreground mt-1">
                Remplissez les informations ci-dessous pour créer une nouvelle alerte sanitaire.
                L&apos;alerte sera diffusée à l&apos;ensemble des pharmacies connectées au réseau MédiHelm.
                Assurez-vous de l&apos;exactitude des informations avant publication.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Form Component */}
      <AlertForm mode="create" />
    </div>
  )
}
