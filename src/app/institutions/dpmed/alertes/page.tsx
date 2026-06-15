'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Filter,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface AlerteDPMED {
  id: string
  referenceOfficielle: string
  titre: string
  typeAlerte: string
  niveauUrgence: string
  dciConcernee: string | null
  description: string | null
  statut: string
  dateEmissionDPMED: string
  createdAt: string
  diffusions: Array<{
    id: string
    statut: string
    pharmacieId: string
    pharmacie: { id: string; nom: string; ville: string }
  }>
}

interface AlertesData {
  alertes: AlerteDPMED[]
  stats: {
    total: number
    enCours: number
    acquitees: number
  }
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const TYPE_LABELS: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM Suspendue',
  INTERDICTION: 'Interdiction',
  INFORMATION: 'Information',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
}

const URGENCY_COLORS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'bg-red-600 text-white',
  URGENT: 'bg-orange-500 text-white',
  ATTENTION: 'bg-amber-500 text-white',
  INFO: 'bg-blue-500 text-white',
}

const URGENCY_LABELS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'Urgence immédiate',
  URGENT: 'Urgent',
  ATTENTION: 'Attention',
  INFO: 'Informatif',
}

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  EN_DIFFUSION: { label: 'En diffusion', color: 'bg-amber-100 text-amber-800' },
  ACQUITTEE: { label: 'Acquittée', color: 'bg-green-100 text-green-800' },
  EXPIREE: { label: 'Expirée', color: 'bg-gray-100 text-gray-800' },
  ANNULEE: { label: 'Annulée', color: 'bg-red-100 text-red-800' },
}

export default function AlertesPage() {
  const [data, setData] = useState<AlertesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterUrgence, setFilterUrgence] = useState<string>('all')
  const [filterStatut, setFilterStatut] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const fetchAlertes = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', page.toString())
        params.set('limit', '15')
        if (filterType !== 'all') params.set('type', filterType)
        if (filterUrgence !== 'all') params.set('urgence', filterUrgence)
        if (filterStatut !== 'all') params.set('statut', filterStatut)

        const res = await fetch(`/api/institutions/dpmed/alertes?${params.toString()}`)
        if (res.ok) {
          const d = await res.json()
          setData(d)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAlertes()
  }, [page, filterType, filterUrgence, filterStatut])

  // Client-side search filter
  const filteredAlertes = (data?.alertes || []).filter(a => {
    if (!searchTerm) return true
    const term = searchTerm.toLowerCase()
    return a.titre.toLowerCase().includes(term)
      || a.referenceOfficielle.toLowerCase().includes(term)
      || (a.dciConcernee || '').toLowerCase().includes(term)
  })

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <AlertTriangle className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-800">Alertes DPMED</h1>
            <p className="text-sm text-muted-foreground">Gestion et suivi des alertes sanitaires</p>
          </div>
        </div>
        <Link href="/institutions/dpmed/alertes/nouvelle">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle alerte
          </Button>
        </Link>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-teal-600" />
            <div>
              <div className="text-2xl font-bold text-teal-800">{data?.stats.total || 0}</div>
              <p className="text-xs text-muted-foreground">Total alertes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-600" />
            <div>
              <div className="text-2xl font-bold text-amber-600">{data?.stats.enCours || 0}</div>
              <p className="text-xs text-muted-foreground">En cours de diffusion</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <div className="text-2xl font-bold text-green-700">{data?.stats.acquitees || 0}</div>
              <p className="text-xs text-muted-foreground">Acquittées</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-teal-200">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par titre, référence ou DCI..."
                className="pl-8 border-teal-200"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1) }}>
                <SelectTrigger className="w-40 border-teal-200">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterUrgence} onValueChange={v => { setFilterUrgence(v); setPage(1) }}>
                <SelectTrigger className="w-40 border-teal-200">
                  <SelectValue placeholder="Urgence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous niveaux</SelectItem>
                  {Object.entries(URGENCY_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatut} onValueChange={v => { setFilterStatut(v); setPage(1) }}>
                <SelectTrigger className="w-40 border-teal-200">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card className="border-teal-200">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
              <span className="ml-2 text-muted-foreground">Chargement...</span>
            </div>
          ) : (
            <ScrollArea className="max-h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Urgence</TableHead>
                    <TableHead>DCI</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Diffusions</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlertes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-12">
                        <AlertTriangle className="h-8 w-8 mx-auto text-teal-300 mb-3" />
                        <p>Aucune alerte trouvée</p>
                        <p className="text-xs mt-1">Modifiez les filtres ou créez une nouvelle alerte</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlertes.map((alerte) => {
                      const statutConf = STATUT_CONFIG[alerte.statut] || STATUT_CONFIG.EN_DIFFUSION
                      const acquittées = alerte.diffusions.filter(d => d.statut === 'ACQUITTEE').length
                      const total = alerte.diffusions.length
                      return (
                        <TableRow key={alerte.id} className="hover:bg-teal-50/50 cursor-pointer">
                          <TableCell className="font-mono text-xs">{alerte.referenceOfficielle}</TableCell>
                          <TableCell>
                            <Link href={`/institutions/dpmed/alertes/${alerte.id}`} className="font-medium text-teal-800 hover:underline">
                              {alerte.titre}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {TYPE_LABELS[alerte.typeAlerte] || alerte.typeAlerte}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs ${URGENCY_COLORS[alerte.niveauUrgence] || 'bg-gray-100 text-gray-800'}`}>
                              {URGENCY_LABELS[alerte.niveauUrgence] || alerte.niveauUrgence}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{alerte.dciConcernee || '—'}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-xs ${statutConf.color}`}>
                              {statutConf.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="text-green-600 font-medium">{acquittées}</span>
                            <span className="text-muted-foreground">/{total}</span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(alerte.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {data.pagination.total} alerte(s) au total — Page {data.pagination.page}/{data.pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="border-teal-300 text-teal-700"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
              className="border-teal-300 text-teal-700"
            >
              Suivant
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
