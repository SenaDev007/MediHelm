'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, ShieldAlert, Filter, ExternalLink, Info } from 'lucide-react'
import { motion } from 'framer-motion'

interface RecallAlert {
  id: string
  titre: string
  description: string
  typeAlerte: string
  niveauUrgence: string
  dciConcernee: string | null
  numerosLotConcernes: string[]
  dateEmissionDPMED: string
  fabricantConcerne: string | null
  documentOfficielUrl: string | null
}

const severityConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  URGENCE_IMMEDIATE: { label: 'Urgence immédiate', color: 'bg-red-100 text-red-800 border-red-200', icon: ShieldAlert },
  URGENT: { label: 'Urgent', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
  NORMAL: { label: 'Normal', color: 'bg-blue-50 text-blue-800 border-blue-200', icon: Info },
  INFORMATIF: { label: 'Informatif', color: 'bg-teal-50 text-teal-800 border-teal-200', icon: Info },
}

const typeLabels: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM suspendue',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
  INFO_REGLEMENTAIRE: 'Info réglementaire',
}

export default function RappelsPage() {
  const [alerts, setAlerts] = useState<RecallAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null)

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const res = await fetch('/api/alertes/dpmed')
        if (res.ok) {
          const data = await res.json()
          setAlerts(data)
        }
      } catch {
        // Use mock data
        setAlerts([
          {
            id: '1',
            titre: 'Rappel lot Paracétamol 500mg',
            description: 'Rappel du lot PRC2026A en raison d\'un défaut de dissolution. Les patients ayant ce lot doivent cesser de l\'utiliser et le rapporter à leur pharmacie.',
            typeAlerte: 'RAPPEL_LOT',
            niveauUrgence: 'URGENT',
            dciConcernee: 'Paracétamol',
            numerosLotConcernes: ['PRC2026A', 'PRC2026B'],
            dateEmissionDPMED: '2026-05-25',
            fabricantConcerne: 'PharmaBénin SA',
            documentOfficielUrl: null,
          },
          {
            id: '2',
            titre: 'Contrefaçon détectée — Amoxicilline',
            description: 'Des lots contrefaits d\'Amoxicilline 500mg ont été identifiés sur le marché. Vérifiez vos médicaments.',
            typeAlerte: 'CONTREFACON',
            niveauUrgence: 'URGENCE_IMMEDIATE',
            dciConcernee: 'Amoxicilline',
            numerosLotConcernes: ['AMX-FAKE-001'],
            dateEmissionDPMED: '2026-05-28',
            fabricantConcerne: null,
            documentOfficielUrl: null,
          },
          {
            id: '3',
            titre: 'Suspension AMM — Méthotrexate',
            description: 'L\'AMM du Méthotrexate 2.5mg de certain fabricant a été suspendue temporairement.',
            typeAlerte: 'AMM_SUSPENDUE',
            niveauUrgence: 'NORMAL',
            dciConcernee: 'Méthotrexate',
            numerosLotConcernes: [],
            dateEmissionDPMED: '2026-05-20',
            fabricantConcerne: 'LaboTest Inc.',
            documentOfficielUrl: null,
          },
        ])
      } finally {
        setLoading(false)
      }
    }
    fetchAlerts()
  }, [])

  const filtered = filterSeverity
    ? alerts.filter(a => a.niveauUrgence === filterSeverity)
    : alerts

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-amber-500" />
        Alertes de rappel DPMED
      </h1>
      <p className="text-xs text-muted-foreground">
        Alertes officielles de la Direction des Produits Médicaux et du Médicament
      </p>

      {/* Severity filter */}
      <div className="flex gap-1.5 flex-wrap">
        <Badge
          variant={filterSeverity === null ? 'default' : 'secondary'}
          className={`cursor-pointer text-xs ${
            filterSeverity === null ? 'bg-primary text-white border-0' : 'bg-teal-50 text-teal-800 border-0'
          }`}
          onClick={() => setFilterSeverity(null)}
        >
          Toutes ({alerts.length})
        </Badge>
        {Object.entries(severityConfig).map(([key, config]) => {
          const count = alerts.filter(a => a.niveauUrgence === key).length
          if (count === 0) return null
          return (
            <Badge
              key={key}
              variant={filterSeverity === key ? 'default' : 'secondary'}
              className={`cursor-pointer text-xs ${
                filterSeverity === key ? 'bg-primary text-white border-0' : 'bg-teal-50 text-teal-800 border-0'
              }`}
              onClick={() => setFilterSeverity(filterSeverity === key ? null : key)}
            >
              {config.label} ({count})
            </Badge>
          )
        })}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <Card key={i} className="border-teal-200 animate-pulse">
              <CardContent className="p-4 space-y-2">
                <div className="h-5 bg-teal-50 rounded w-3/4" />
                <div className="h-3 bg-teal-50 rounded w-full" />
                <div className="h-3 bg-teal-50 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((alert) => {
            const severity = severityConfig[alert.niveauUrgence] || severityConfig.INFORMATIF
            return (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className={`border-2 ${severity.color.split(' ')[2] || 'border-teal-200'}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${severity.color.split(' ').slice(0, 2).join(' ')}`}>
                        <severity.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">{alert.titre}</h3>
                          <Badge className={`text-[9px] border-0 ${severity.color}`}>{severity.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{alert.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {alert.dciConcernee && (
                            <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-800 border-0">
                              {alert.dciConcernee}
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-800 border-0">
                            {typeLabels[alert.typeAlerte] || alert.typeAlerte}
                          </Badge>
                          {alert.numerosLotConcernes.length > 0 && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-800 border-0">
                              Lots: {alert.numerosLotConcernes.join(', ')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {new Date(alert.dateEmissionDPMED).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'long', year: 'numeric'
                          })}
                          {alert.fabricantConcerne && ` • ${alert.fabricantConcerne}`}
                        </p>
                        {alert.documentOfficielUrl && (
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary mt-1 p-0">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Document officiel
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
          {filtered.length === 0 && (
            <Card className="border-teal-200">
              <CardContent className="p-6 text-center">
                <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune alerte de rappel active</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
