'use client'

import { ClipboardCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ComplianceOverview } from '@/components/institutions/compliance-overview'

export default function ConformitePage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
          <ClipboardCheck className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-teal-800">Conformité réglementaire</h1>
          <p className="text-sm text-muted-foreground">Scores de conformité et certifications DPMED</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="border-teal-200 bg-teal-50/30">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="h-5 w-5 text-teal-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-teal-800">Évaluation de conformité</p>
              <p className="text-xs text-muted-foreground mt-1">
                Les scores de conformité sont calculés automatiquement sur la base des données soumises par les pharmacies.
                Le score total est la moyenne pondérée de 5 critères : registre des stupéfiants, acquittement des alertes DPMED,
                tenue des documents, signalements de pharmacovigilance, et destructions réglementaires.
                Une certification DPMED est attribuée aux pharmacies obtenant un score supérieur à 85%.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance Overview Component */}
      <ComplianceOverview />

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="text-base text-teal-800">Critères d&apos;évaluation</CardTitle>
            <CardDescription>5 dimensions de conformité</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Registre des stupéfiants', desc: 'Tenue et mise à jour du registre des stupéfiants', weight: '20%' },
              { label: 'Alertes DPMED', desc: 'Acquittement des alertes sanitaires dans les délais', weight: '25%' },
              { label: 'Documents réglementaires', desc: 'Ordonnances, déclarations trimestrielles, licences', weight: '20%' },
              { label: 'Pharmacovigilance', desc: 'Signalement des effets indésirables', weight: '20%' },
              { label: 'Destructions', desc: 'Procédures de destruction réglementaires', weight: '15%' },
            ].map((c, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-teal-100 bg-white">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 flex-shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-teal-800">{c.label}</p>
                    <Badge variant="outline" className="text-xs border-teal-300 text-teal-700">{c.weight}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-teal-200">
          <CardHeader>
            <CardTitle className="text-base text-teal-800">Seuils de certification</CardTitle>
            <CardDescription>Barème de conformité DPMED</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border-2 border-green-200 bg-green-50/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="font-semibold text-green-800">Conforme (≥ 85%)</span>
              </div>
              <p className="text-xs text-green-700">
                La pharmacie respecte toutes les obligations réglementaires. Éligible à la certification DPMED.
              </p>
            </div>
            <div className="p-4 rounded-lg border-2 border-amber-200 bg-amber-50/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="font-semibold text-amber-800">Écart (70% — 84%)</span>
              </div>
              <p className="text-xs text-amber-700">
                Des améliorations sont nécessaires sur certains critères. Un plan d&apos;action correctif est recommandé.
              </p>
            </div>
            <div className="p-4 rounded-lg border-2 border-red-200 bg-red-50/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <span className="font-semibold text-red-800">Non conforme (&lt; 70%)</span>
              </div>
              <p className="text-xs text-red-700">
                Des manquements graves sont constatés. Une inspection sur site peut être diligentée par la DPMED.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
