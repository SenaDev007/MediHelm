'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  XCircle,
  Activity,
  Shield,
  TrendingUp,
  Loader2,
  Plus,
  Map,
  Heart,
  ClipboardCheck,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
} from 'recharts'

interface DashboardData {
  kpis: {
    totalAlertes: number
    alertesEnCours: number
    alertesAcquittees: number
    alertesExpirees: number
    alertesAnnulees: number
    tauxAcquittement: number
    avgScoreConformite: number
    pharmaciesCertifiees: number
    pharmaciesSous70: number
    totalDiffusions: number
    diffusionsAcquittees: number
  }
  alertesParType: Array<{ type: string; count: number }>
  alertesParUrgence: Array<{ urgence: string; count: number }>
  alertesRecentes: Array<{
    id: string
    titre: string
    typeAlerte: string
    niveauUrgence: string
    statut: string
    dciConcernee: string | null
    referenceOfficielle: string
    createdAt: string
    diffusions: Array<{
      id: string
      statut: string
      pharmacieId: string
    }>
  }>
  monthlyTrend: Array<{ mois: string; total: number; acquittées: number }>
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

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  EN_DIFFUSION: { label: 'En diffusion', color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
  ACQUITTEE: { label: 'Acquittée', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  EXPIREE: { label: 'Expirée', color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
  ANNULEE: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
}

const PIE_COLORS = ['#1D9E75', '#EF9F27', '#378ADD', '#E24B4A', '#9FE1CB', '#085041']

export default function DPMEDDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/portail/dpmed/dashboard')
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
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Shield className="h-7 w-7 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold text-teal-800">Tableau de bord DPMED</h1>
            <p className="text-sm text-muted-foreground">Direction de la Pharmacie et du Médicament</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse border-teal-200">
              <CardContent className="p-6">
                <div className="h-20 bg-teal-50 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card className="border-teal-200 p-8 text-center">
          <p className="text-muted-foreground">Aucune donnée disponible. Vérifiez la connexion à la base de données.</p>
        </Card>
      </div>
    )
  }

  const { kpis, alertesRecentes, monthlyTrend, alertesParType, alertesParUrgence } = data

  const pieData = alertesParType.map(a => ({
    name: TYPE_LABELS[a.type] || a.type,
    value: a.count,
  }))

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <Shield className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-800">Tableau de bord DPMED</h1>
            <p className="text-sm text-muted-foreground">Direction de la Pharmacie et du Médicament</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/institutions/dpmed/alertes/nouvelle">
            <Button className="bg-teal-600 hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-2" />
              Nouvelle alerte
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-teal-200 border-l-4 border-l-red-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total alertes</p>
                <p className="text-3xl font-bold text-teal-800">{kpis.totalAlertes}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Toutes les alertes émises</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">En cours</p>
                <p className="text-3xl font-bold text-amber-600">{kpis.alertesEnCours}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <Progress value={kpis.totalAlertes > 0 ? (kpis.alertesEnCours / kpis.totalAlertes) * 100 : 0} className="mt-2 h-2 [&>div]:bg-amber-500" />
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Acquittées</p>
                <p className="text-3xl font-bold text-green-700">{kpis.alertesAcquittees}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-green-600 mt-2 font-medium">Taux : {kpis.tauxAcquittement}%</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-teal-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Taux conformité</p>
                <p className="text-3xl font-bold text-teal-700">{kpis.avgScoreConformite}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center">
                <ClipboardCheck className="h-6 w-6 text-teal-500" />
              </div>
            </div>
            <Progress value={kpis.avgScoreConformite} className="mt-2 h-2 [&>div]:bg-teal-500" />
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-green-700">{kpis.pharmaciesCertifiees}</p>
              <p className="text-xs text-muted-foreground">Pharmacies certifiées DPMED</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-lg font-bold text-red-600">{kpis.pharmaciesSous70}</p>
              <p className="text-xs text-muted-foreground">Pharmacies sous 70% conformité</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-teal-200 bg-teal-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Activity className="h-5 w-5 text-teal-600" />
            <div>
              <p className="text-lg font-bold text-teal-700">{kpis.totalDiffusions}</p>
              <p className="text-xs text-muted-foreground">Diffusions totales ({kpis.diffusionsAcquittees} acquittées)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <Card className="lg:col-span-2 border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Tendance mensuelle des alertes</CardTitle>
            <CardDescription>6 derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #9FE1CB', borderRadius: '8px' }} />
                  <Bar dataKey="total" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="acquittées" fill="#9FE1CB" radius={[4, 4, 0, 0]} name="Acquittées" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alert Type Distribution */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Répartition par type</CardTitle>
            <CardDescription>Types d&apos;alertes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value">
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Aucune alerte
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgency Distribution */}
      {alertesParUrgence.length > 0 && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Répartition par niveau d&apos;urgence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {alertesParUrgence.map((a) => (
                <div key={a.urgence} className="flex items-center gap-2">
                  <Badge className={URGENCY_COLORS[a.urgence] || 'bg-gray-100 text-gray-800'}>
                    {URGENCY_LABELS[a.urgence] || a.urgence}
                  </Badge>
                  <span className="text-sm font-semibold">{a.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Alerts Table */}
      <Card className="border-teal-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base text-teal-800">Alertes récentes</CardTitle>
              <CardDescription>Dernières alertes émises par la DPMED</CardDescription>
            </div>
            <Link href="/institutions/dpmed/alertes">
              <Button variant="outline" size="sm" className="border-teal-300 text-teal-700">
                Voir toutes les alertes
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Référence</TableHead>
                  <TableHead>Titre</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Urgence</TableHead>
                  <TableHead>DCI</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertesRecentes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucune alerte pour le moment
                    </TableCell>
                  </TableRow>
                ) : (
                  alertesRecentes.map((alerte) => {
                    const statutConf = STATUT_CONFIG[alerte.statut] || STATUT_CONFIG.EN_DIFFUSION
                    return (
                      <TableRow key={alerte.id} className="cursor-pointer hover:bg-teal-50/50">
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
                            {statutConf.icon}
                            <span className="ml-1">{statutConf.label}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(alerte.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
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

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/institutions/dpmed/carte">
          <Card className="border-teal-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Map className="h-8 w-8 text-teal-600" />
              <div>
                <p className="font-semibold text-teal-800">Carte de couverture</p>
                <p className="text-xs text-muted-foreground">Visualiser les pharmacies sur la carte</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/institutions/dpmed/pharmacovigilance">
          <Card className="border-teal-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <Heart className="h-8 w-8 text-teal-600" />
              <div>
                <p className="font-semibold text-teal-800">Pharmacovigilance</p>
                <p className="text-xs text-muted-foreground">Signalements EI et surveillance</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/institutions/dpmed/conformite">
          <Card className="border-teal-200 hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <ClipboardCheck className="h-8 w-8 text-teal-600" />
              <div>
                <p className="font-semibold text-teal-800">Conformité</p>
                <p className="text-xs text-muted-foreground">Scores et certifications</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
