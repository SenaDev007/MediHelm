'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Heart,
  AlertTriangle,
  Eye,
  Shield,
  Loader2,
  Filter,
  Search,
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface SignalementEI {
  id: string
  dciConcernee: string
  descriptionEI: string
  gravite: string
  dateDebut: string
  statutEnvoi: string
  refDPMED: string | null
  createdAt: string
  pharmacie: {
    id: string
    nom: string
    ville: string
  }
}

interface Surveillance {
  id: string
  dci: string
  nomCommercial: string | null
  typeSurveillance: string
  description: string
  sourceAlerte: string
  dateEmission: string
  niveauRisque: string
  statut: string
}

interface PharmacoData {
  signalements: SignalementEI[]
  surveillances: Surveillance[]
  stats: {
    totalSignalements: number
    signalementsParGravite: Array<{ gravite: string; count: number }>
    signalementsParStatut: Array<{ statut: string; count: number }>
    totalSurveillances: number
    surveillanceParType: Array<{ type: string; count: number }>
    surveillanceParRisque: Array<{ risque: string; count: number }>
  }
}

const GRAVITE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  MINEUR: { label: 'Mineur', color: 'text-green-700', bgColor: 'bg-green-100' },
  MODERE: { label: 'Modéré', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  GRAVE: { label: 'Grave', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  VITAL: { label: 'Vital', color: 'text-red-700', bgColor: 'bg-red-100' },
}

const SURVEILLANCE_TYPE_LABELS: Record<string, string> = {
  SOUS_SURVEILLANCE: 'Sous surveillance',
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM suspendue',
  INTERDICTION: 'Interdiction',
}

const RISQUE_CONFIG: Record<string, { label: string; color: string }> = {
  FAIBLE: { label: 'Faible', color: 'bg-green-100 text-green-800' },
  MODERE: { label: 'Modéré', color: 'bg-amber-100 text-amber-800' },
  ELEVE: { label: 'Élevé', color: 'bg-orange-100 text-orange-800' },
  CRITIQUE: { label: 'Critique', color: 'bg-red-100 text-red-800' },
}

const PIE_COLORS = ['#1D9E75', '#EF9F27', '#378ADD', '#E24B4A']

export default function PharmacovigilancePage() {
  const [data, setData] = useState<PharmacoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterGravite, setFilterGravite] = useState<string>('all')
  const [searchDCI, setSearchDCI] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/institutions/dpmed/pharmacovigilance')
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
    fetchData()
  }, [])

  const filteredSignalements = (data?.signalements || []).filter(s => {
    if (filterGravite !== 'all' && s.gravite !== filterGravite) return false
    if (searchDCI && !s.dciConcernee.toLowerCase().includes(searchDCI.toLowerCase())) return false
    return true
  })

  const filteredSurveillances = (data?.surveillances || []).filter(s => {
    if (searchDCI && !s.dci.toLowerCase().includes(searchDCI.toLowerCase())) return false
    return true
  })

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Heart className="h-7 w-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-teal-800">Pharmacovigilance</h1>
        </div>
        <Card className="animate-pulse border-teal-200">
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
          <Heart className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-teal-800">Pharmacovigilance</h1>
          <p className="text-sm text-muted-foreground">Effets indésirables et surveillance des médicaments</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-800">{data?.stats.totalSignalements || 0}</div>
            <p className="text-xs text-muted-foreground">Signalements EI</p>
          </CardContent>
        </Card>
        {data?.stats.signalementsParGravite.map((sg) => {
          const conf = GRAVITE_CONFIG[sg.gravite] || GRAVITE_CONFIG.MODERE
          return (
            <Card key={sg.gravite} className={`border-teal-200 ${conf.bgColor}/30`}>
              <CardContent className="pt-4">
                <div className={`text-2xl font-bold ${conf.color}`}>{sg.count}</div>
                <p className="text-xs text-muted-foreground">EI {conf.label}</p>
              </CardContent>
            </Card>
          )
        })}
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-800">{data?.stats.totalSurveillances || 0}</div>
            <p className="text-xs text-muted-foreground">Médicaments sous surveillance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signalements par gravité */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Signalements par gravité</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={(data?.stats.signalementsParGravite || []).map(s => ({
                      name: GRAVITE_CONFIG[s.gravite]?.label || s.gravite,
                      value: s.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(data?.stats.signalementsParGravite || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Surveillance par risque */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Surveillance par niveau de risque</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(data?.stats.surveillanceParRisque || []).map(s => ({
                    name: RISQUE_CONFIG[s.risque]?.label || s.risque,
                    count: s.count,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #9FE1CB', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Nombre" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EI Signalements Section */}
      <Card className="border-teal-200">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-base text-teal-800">Signalements d&apos;effets indésirables</CardTitle>
              <CardDescription>Déclarations soumises par les pharmacies</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  value={searchDCI}
                  onChange={(e) => setSearchDCI(e.target.value)}
                  placeholder="Rechercher DCI..."
                  className="pl-8 w-48 border-teal-200 h-9"
                />
              </div>
              <Select value={filterGravite} onValueChange={setFilterGravite}>
                <SelectTrigger className="w-36 border-teal-200 h-9">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Gravité" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="MINEUR">Mineur</SelectItem>
                  <SelectItem value="MODERE">Modéré</SelectItem>
                  <SelectItem value="GRAVE">Grave</SelectItem>
                  <SelectItem value="VITAL">Vital</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DCI</TableHead>
                  <TableHead>Pharmacie</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Gravité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignalements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Aucun signalement trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSignalements.map((s) => {
                    const graviteConf = GRAVITE_CONFIG[s.gravite] || GRAVITE_CONFIG.MODERE
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-teal-800">{s.dciConcernee}</TableCell>
                        <TableCell>
                          <div className="text-sm">{s.pharmacie.nom}</div>
                          <div className="text-xs text-muted-foreground">{s.pharmacie.ville}</div>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm text-muted-foreground">{s.descriptionEI}</TableCell>
                        <TableCell>
                          <Badge className={`${graviteConf.bgColor} ${graviteConf.color}`}>
                            {graviteConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{s.statutEnvoi}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Drug Surveillance Section */}
      <Card className="border-teal-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-teal-800">Médicaments sous surveillance</CardTitle>
          <CardDescription>Alertes de surveillance actives émises par la DPMED</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DCI</TableHead>
                  <TableHead>Nom commercial</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Risque</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSurveillances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucune surveillance active
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSurveillances.map((s) => {
                    const risqueConf = RISQUE_CONFIG[s.niveauRisque] || RISQUE_CONFIG.MODERE
                    return (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-teal-800">{s.dci}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{s.nomCommercial || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {SURVEILLANCE_TYPE_LABELS[s.typeSurveillance] || s.typeSurveillance}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${risqueConf.color}`}>
                            {risqueConf.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-48 truncate text-sm text-muted-foreground">{s.description}</TableCell>
                        <TableCell className="text-xs">{s.sourceAlerte}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(s.dateEmission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Info Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Obligation de signalement</p>
              <p className="text-xs text-amber-700 mt-1">
                Conformément à la réglementation pharmaceutique béninoise, tout effet indésirable suspecté doit être signalé
                dans les 24 heures pour les cas graves, et dans les 15 jours pour les cas non graves. La DPMED assure
                le suivi et la diffusion des alertes de pharmacovigilance à l&apos;ensemble du réseau.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
