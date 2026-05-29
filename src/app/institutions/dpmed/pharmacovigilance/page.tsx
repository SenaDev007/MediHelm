'use client'

import { useState, useEffect } from 'react'
import {
  Heart,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  LineChart,
  Line,
} from 'recharts'
import { toast } from 'sonner'

const GRAVITE_COLORS: Record<string, string> = {
  LEGER: '#1D9E75',
  MODERE: '#EF9F27',
  GRAVE: '#E24B4A',
  FATAL: '#7C2D12',
}

const GRAVITE_LABELS: Record<string, string> = {
  LEGER: 'Léger',
  MODERE: 'Modéré',
  GRAVE: 'Grave',
  FATAL: 'Fatal',
}

const STATUT_LABELS: Record<string, string> = {
  EN_ATTENTE: 'En attente',
  SOUMIS: 'Soumis',
  ACCUSE_RECEPTION: 'Accusé de réception',
  EN_ANALYSE: 'En analyse',
  CLOTURE: 'Clôturé',
}

interface PharmacoData {
  total: number
  parGravite: { gravite: string; count: number }[]
  parStatut: { statut: string; count: number }[]
  parDCI: { dci: string; count: number }[]
  parRegion: { ville: string; count: number }[]
  recentSignalements: Array<{
    id: string
    patientCode: string
    dciConcernee: string
    descriptionEI: string
    gravite: string
    dateDebut: string
    statutEnvoi: string
    pharmacie?: { nom: string; ville: string }
    medicament?: { dci: string; nomCommercial: string }
  }>
  medicamentsSurveillance: Array<{
    id: string
    dci: string
    typeSurveillance: string
    niveauRisque: string
    description: string
    dateEmission: string
    _count: { signalementsEI: number; alertesDPMED: number }
  }>
  dailyStats: Array<{
    date: string
    leger: number
    modere: number
    grave: number
    fatal: number
  }>
}

export default function PharmacovigilancePage() {
  const [data, setData] = useState<PharmacoData | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-muted-foreground">Chargement des données de pharmacovigilance...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
            <Heart className="h-6 w-6" />
            Pharmacovigilance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivi des effets indésirables et médicaments sous surveillance
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info('Export en préparation...')} className="border-teal-300 text-teal-700">
          <Download className="h-4 w-4 mr-1" />
          Exporter rapport PV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-800">{data?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Total signalements EI</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-700">
              {data?.parGravite.find(g => g.gravite === 'GRAVE')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Signalements graves</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-700">
              {data?.parGravite.find(g => g.gravite === 'FATAL')?.count || 0}
            </div>
            <p className="text-xs text-muted-foreground">Cas fatals</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-800">
              {data?.medicamentsSurveillance.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">Médicaments sous surveillance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By gravity */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par gravité</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.parGravite.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.parGravite.map(g => ({
                      name: GRAVITE_LABELS[g.gravite] || g.gravite,
                      value: g.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.parGravite.map((entry, index) => (
                      <Cell key={index} fill={GRAVITE_COLORS[entry.gravite] || '#1D9E75'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* By DCI */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top DCI signalées</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.parDCI.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.parDCI.slice(0, 7)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="dci" type="category" tick={{ fontSize: 10 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1D9E75" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* EI Timeline */}
      {data && data.dailyStats.length > 0 && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Évolution des signalements (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="leger" stroke={GRAVITE_COLORS.LEGER} name="Léger" />
                <Line type="monotone" dataKey="modere" stroke={GRAVITE_COLORS.MODERE} name="Modéré" />
                <Line type="monotone" dataKey="grave" stroke={GRAVITE_COLORS.GRAVE} name="Grave" />
                <Line type="monotone" dataKey="fatal" stroke={GRAVITE_COLORS.FATAL} name="Fatal" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Regional Breakdown */}
      {data && data.parRegion.length > 0 && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par région</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.parRegion.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                <XAxis dataKey="ville" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#0F6E56" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Medications Under Surveillance */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Médicaments sous surveillance active
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.medicamentsSurveillance.length > 0 ? (
            <ScrollArea className="max-h-64">
              <div className="space-y-3">
                {data.medicamentsSurveillance.map((med) => (
                  <div key={med.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/30">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-amber-800">{med.dci}</span>
                        <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                          {med.typeSurveillance}
                        </Badge>
                        <Badge className={`text-[10px] ${
                          med.niveauRisque === 'CRITIQUE' ? 'bg-red-100 text-red-800' :
                          med.niveauRisque === 'ELEVE' ? 'bg-orange-100 text-orange-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {med.niveauRisque}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{med.description}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex-shrink-0 ml-4">
                      <div>{med._count.signalementsEI} signalements EI</div>
                      <div>{med._count.alertesDPMED} alertes DPMED</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">Aucun médicament sous surveillance</p>
          )}
        </CardContent>
      </Card>

      {/* Recent EI Reports */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="text-base">Signalements récents d&apos;effets indésirables</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>DCI</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Gravité</TableHead>
                  <TableHead>Pharmacie</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.recentSignalements.length > 0 ? (
                  data.recentSignalements.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.patientCode}</TableCell>
                      <TableCell className="text-sm">{s.dciConcernee}</TableCell>
                      <TableCell className="text-xs max-w-48 truncate">{s.descriptionEI}</TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] ${
                          s.gravite === 'FATAL' ? 'bg-red-800 text-white' :
                          s.gravite === 'GRAVE' ? 'bg-red-100 text-red-800' :
                          s.gravite === 'MODERE' ? 'bg-amber-100 text-amber-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {GRAVITE_LABELS[s.gravite] || s.gravite}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.pharmacie?.nom || '-'}
                        <div className="text-muted-foreground">{s.pharmacie?.ville}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {STATUT_LABELS[s.statutEnvoi] || s.statutEnvoi}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(s.dateDebut).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucun signalement
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
