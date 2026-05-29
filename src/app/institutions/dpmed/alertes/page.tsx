'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'

const TYPE_LABELS: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM Suspendue',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
  INFO_REGLEMENTAIRE: 'Info réglementaire',
}

const TYPE_COLORS: Record<string, string> = {
  RAPPEL_LOT: 'bg-red-100 text-red-800 border-red-300',
  CONTREFACON: 'bg-orange-100 text-orange-800 border-orange-300',
  AMM_SUSPENDUE: 'bg-blue-100 text-blue-800 border-blue-300',
  PHARMACOVIGILANCE: 'bg-purple-100 text-purple-800 border-purple-300',
  INFO_REGLEMENTAIRE: 'bg-teal-100 text-teal-800 border-teal-300',
}

const URGENCY_LABELS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'Urgence immédiate',
  URGENT: 'Urgent',
  NORMAL: 'Normal',
  INFORMATIF: 'Informatif',
}

const URGENCY_COLORS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'bg-red-600 text-white',
  URGENT: 'bg-orange-500 text-white',
  NORMAL: 'bg-blue-500 text-white',
  INFORMATIF: 'bg-teal-500 text-white',
}

const STATUT_LABELS: Record<string, string> = {
  EN_DIFFUSION: 'En diffusion',
  DIFFUSEE: 'Diffusée',
  ARCHIVEE: 'Archivée',
}

interface AlertItem {
  id: string
  referenceOfficielle: string
  titre: string
  description: string
  typeAlerte: string
  niveauUrgence: string
  dciConcernee: string | null
  numerosLotConcernes: string[]
  statut: string
  dateEmissionDPMED: string
  nbOfficinesNotifiees: number
  nbOfficinesAcquittees: number
  tauxAcquittement: number
  medicamentSurv?: {
    dci: string
    typeSurveillance: string
    niveauRisque: string
  }
}

export default function AlertesPage() {
  const [alertes, setAlertes] = useState<AlertItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterUrgence, setFilterUrgence] = useState<string>('all')
  const [filterStatut, setFilterStatut] = useState<string>('all')

  useEffect(() => {
    const fetchAlertes = async () => {
      try {
        const params = new URLSearchParams()
        if (filterType !== 'all') params.set('typeAlerte', filterType)
        if (filterUrgence !== 'all') params.set('niveauUrgence', filterUrgence)
        if (filterStatut !== 'all') params.set('statut', filterStatut)

        const res = await fetch(`/api/institutions/dpmed/alertes?${params}`)
        if (res.ok) {
          const data = await res.json()
          setAlertes(data)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAlertes()
  }, [filterType, filterUrgence, filterStatut])

  const filtered = alertes.filter(a => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      a.titre.toLowerCase().includes(q) ||
      a.referenceOfficielle.toLowerCase().includes(q) ||
      (a.dciConcernee && a.dciConcernee.toLowerCase().includes(q))
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Alertes DPMED
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion et suivi des alertes sanitaires émises par la DPMED
          </p>
        </div>
        <Link href="/institutions/dpmed/alertes/nouvelle">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle alerte
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="border-teal-200">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher par titre, référence ou DCI..."
                  className="pl-9 border-teal-200"
                />
              </div>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-48 border-teal-200">
                <SelectValue placeholder="Type d'alerte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {Object.entries(TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterUrgence} onValueChange={setFilterUrgence}>
              <SelectTrigger className="w-full sm:w-48 border-teal-200">
                <SelectValue placeholder="Niveau d'urgence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les niveaux</SelectItem>
                {Object.entries(URGENCY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-full sm:w-40 border-teal-200">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {Object.entries(STATUT_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <span className="ml-2 text-muted-foreground">Chargement des alertes...</span>
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-teal-200">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-muted-foreground">Aucune alerte trouvée</h3>
            <p className="text-sm text-muted-foreground mt-1">Modifiez les filtres ou créez une nouvelle alerte</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{filtered.length} alerte(s) trouvée(s)</p>
          <ScrollArea className="max-h-[calc(100vh-350px)]">
            <div className="space-y-3">
              {filtered.map((alert) => (
                <Link key={alert.id} href={`/institutions/dpmed/alertes/${alert.id}`}>
                  <Card className="border-teal-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        {/* Urgency indicator */}
                        <div className="flex items-center gap-2 sm:w-32 flex-shrink-0">
                          <Badge className={`text-[10px] ${URGENCY_COLORS[alert.niveauUrgence]}`}>
                            {URGENCY_LABELS[alert.niveauUrgence]}
                          </Badge>
                        </div>

                        {/* Alert Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-semibold text-teal-800 truncate">{alert.titre}</h3>
                            <Badge variant="outline" className={`text-[10px] ${TYPE_COLORS[alert.typeAlerte]}`}>
                              {TYPE_LABELS[alert.typeAlerte]}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{alert.description}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span className="font-mono">{alert.referenceOfficielle}</span>
                            {alert.dciConcernee && (
                              <span>DCI: <span className="font-medium">{alert.dciConcernee}</span></span>
                            )}
                            {alert.numerosLotConcernes.length > 0 && (
                              <span>{alert.numerosLotConcernes.length} lot(s)</span>
                            )}
                            <span>{new Date(alert.dateEmissionDPMED).toLocaleDateString('fr-FR')}</span>
                          </div>
                        </div>

                        {/* Acquittement */}
                        <div className="text-right flex-shrink-0 sm:w-32">
                          <div className="text-lg font-bold text-teal-700">{alert.tauxAcquittement}%</div>
                          <div className="text-xs text-muted-foreground">
                            {alert.nbOfficinesAcquittees}/{alert.nbOfficinesNotifiees} pharmacies
                          </div>
                          <Progress value={alert.tauxAcquittement} className="mt-1 h-1.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
