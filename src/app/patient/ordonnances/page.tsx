'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

interface Prescription {
  id: string
  prescripteurNom: string
  dateOrdonnance: string
  statut: string
  estStupefiant: boolean
  imageUrl?: string
}

const mockPrescriptions: Prescription[] = [
  {
    id: '1',
    prescripteurNom: 'Dr. Agossou',
    dateOrdonnance: '2026-05-20',
    statut: 'DELIVREE',
    estStupefiant: false,
  },
  {
    id: '2',
    prescripteurNom: 'Dr. Hounkpatin',
    dateOrdonnance: '2026-05-25',
    statut: 'EN_COURS_VALIDATION',
    estStupefiant: false,
  },
  {
    id: '3',
    prescripteurNom: 'Dr. Dossou',
    dateOrdonnance: '2026-05-28',
    statut: 'RECUE',
    estStupefiant: true,
  },
]

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  RECUE: { label: 'Reçue', color: 'bg-blue-50 text-blue-700', icon: Clock },
  EN_COURS_VALIDATION: { label: 'En validation', color: 'bg-amber-50 text-amber-700', icon: Clock },
  VALIDEE: { label: 'Validée', color: 'bg-green-50 text-green-700', icon: CheckCircle },
  PARTIELLEMENT_DELIVREE: { label: 'Partiellement délivrée', color: 'bg-amber-50 text-amber-700', icon: Clock },
  DELIVREE: { label: 'Délivrée', color: 'bg-green-50 text-green-700', icon: CheckCircle },
  REFUSEE: { label: 'Refusée', color: 'bg-red-50 text-red-700', icon: XCircle },
}

export default function OrdonnancesPage() {
  const [prescriptions] = useState<Prescription[]>(mockPrescriptions)
  const [uploading, setUploading] = useState(false)

  const handleUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      // Simulate upload
      await new Promise(resolve => setTimeout(resolve, 1500))
      setUploading(false)
    }
    input.click()
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Mes ordonnances
      </h1>

      {/* Upload button */}
      <Button
        className="w-full h-12 bg-primary hover:bg-teal-700"
        onClick={handleUpload}
        disabled={uploading}
      >
        {uploading ? (
          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours...</>
        ) : (
          <><Upload className="h-4 w-4 mr-2" /> Soumettre une ordonnance</>
        )}
      </Button>

      {/* Prescription list */}
      <div className="space-y-3">
        {prescriptions.map((prescription) => {
          const config = statusConfig[prescription.statut] || statusConfig.RECUE
          return (
            <motion.div
              key={prescription.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="border-teal-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{prescription.prescripteurNom}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(prescription.dateOrdonnance).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={`text-[10px] border-0 ${config.color}`}>
                        {config.label}
                      </Badge>
                      {prescription.estStupefiant && (
                        <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-0">
                          Stupéfiant
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-primary text-primary">
                      Détails
                    </Button>
                    {prescription.statut === 'VALIDEE' && (
                      <Button size="sm" className="flex-1 h-8 text-xs bg-primary">
                        Commander
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Renewal tracking */}
      <Card className="border-teal-200">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Renouvellement</h2>
          <p className="text-xs text-muted-foreground">
            Suivez les dates de renouvellement de vos ordonnances régulières.
          </p>
          <Button variant="outline" size="sm" className="mt-2 h-8 text-xs border-primary text-primary">
            Configurer un rappel
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
