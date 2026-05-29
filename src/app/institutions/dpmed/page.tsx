'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Activity,
  Plus,
  ArrowRight,
  Loader2,
  Bell,
  Shield,
  FileText,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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

const TYPE_COLORS: Record<string, string> = {
  RAPPEL_LOT: '#E24B4A',
  CONTREFACON: '#EF9F27',
  AMM_SUSPENDUE: '#378ADD',
  PHARMACOVIGILANCE: '#9333EA',
  INFO_REGLEMENTAIRE: '#1D9E75',
}

const URGENCY_COLORS: Record<string, string> = {
  URGENCE_IMMEDIATE: '#E24B4A',
  URGENT: '#EF9F27',
  NORMAL: '#378ADD',
  INFORMATIF: '#1D9E75',
}

const TYPE_LABELS: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM Suspendue',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
  INFO_REGLEMENTAIRE: 'Info réglementaire',
}

const URGENCY_LABELS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'Urgence imm.',
  URGENT: 'Urgent',
  NORMAL: 'Normal',
  INFORMATIF: 'Informatif',
}

interface DashboardData {
  totalAlertes: number
  alertesActives: number
  alertesDiffusees: number
  totalPharmacies: number
  tauxAcquittement: string
  repartitionParType: { type: string; count: number }[]
  repartitionParUrgence: { niveau: string; count: number }[]
}

interface RecentAlert {
  id: string
  referenceOfficielle: string
  titre: string
  typeAlerte: string
  niveauUrgence: string
  statut: string
  dateEmissionDPMED: string
  nbOfficinesNotifiees: number
  nbOfficinesAcquittees: number
  dciConcernee: string | null
  tauxAcquittement: number
}

export default function DPMEDDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [recentAlerts, setRecentAlerts] = useState<RecentAlert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, alertsRes] = await Promise.all([
          fetch('/api/portail/dpmed/dashboard'),
          fetch('/api/institutions/dpmed/alertes'),
        ])

        if (dashRes.ok) {
          const dashData = await dashRes.json()
          setDashboard(dashData)
        }

        if (alertsRes.ok) {
          const alertsData = await alertsRes.json()
          setRecentAlerts(alertsData.slice(0, 5))
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
        <span className="ml-3 text-muted-foreground">Chargement du tableau de bord DPMED...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Tableau de bord DPMED
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Direction de la Pharmacie et du Médicament — Résumé des activités
          </p>
        </div>
        <Link href="/institutions/dpmed/alertes/nouvelle">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle alerte
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bell className="h-4 w-4" />
              Total alertes
            </div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{dashboard?.totalAlertes || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              En diffusion
            </div>
            <div className="text-2xl font-bold text-red-700 mt-1">{dashboard?.alertesActives || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Diffusées
            </div>
            <div className="text-2xl font-bold text-green-700 mt-1">{dashboard?.alertesDiffusees || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              Pharmacies
            </div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{dashboard?.totalPharmacies || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Taux acquittement
            </div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{dashboard?.tauxAcquittement || '0'}%</div>
            <Progress value={parseFloat(dashboard?.tauxAcquittement || '0')} className="mt-1 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alert Types Chart */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par type d&apos;alerte</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard && dashboard.repartitionParType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dashboard.repartitionParType.map(t => ({
                  name: TYPE_LABELS[t.type] || t.type,
                  count: t.count,
                  fill: TYPE_COLORS[t.type] || '#1D9E75',
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {dashboard.repartitionParType.map((entry, index) => (
                      <Cell key={index} fill={TYPE_COLORS[entry.type] || '#1D9E75'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Urgency Distribution */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par niveau d&apos;urgence</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard && dashboard.repartitionParUrgence.length > 0 ? (
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={dashboard.repartitionParUrgence.map(u => ({
                        name: URGENCY_LABELS[u.niveau] || u.niveau,
                        value: u.count,
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {dashboard.repartitionParUrgence.map((entry, index) => (
                        <Cell key={index} fill={URGENCY_COLORS[entry.niveau] || '#1D9E75'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Alerts */}
      <Card className="border-teal-200">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-teal-600" />
              Alertes récentes
            </CardTitle>
            <Link href="/institutions/dpmed/alertes">
              <Button variant="ghost" size="sm" className="text-teal-600">
                Voir toutes <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentAlerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Aucune alerte pour le moment
            </div>
          ) : (
            <div className="space-y-3">
              {recentAlerts.map((alert) => (
                <Link
                  key={alert.id}
                  href={`/institutions/dpmed/alertes/${alert.id}`}
                  className="block"
                >
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-teal-100 hover:border-teal-300 hover:bg-teal-50/50 transition-colors">
                    <div
                      className="h-2 w-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: URGENCY_COLORS[alert.niveauUrgence] || '#1D9E75' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{alert.titre}</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] flex-shrink-0"
                          style={{
                            borderColor: TYPE_COLORS[alert.typeAlerte],
                            color: TYPE_COLORS[alert.typeAlerte],
                          }}
                        >
                          {TYPE_LABELS[alert.typeAlerte] || alert.typeAlerte}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{alert.referenceOfficielle}</span>
                        {alert.dciConcernee && <span>• DCI: {alert.dciConcernee}</span>}
                        <span>• {new Date(alert.dateEmissionDPMED).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-semibold text-teal-700">{alert.tauxAcquittement}%</div>
                      <div className="text-xs text-muted-foreground">
                        {alert.nbOfficinesAcquittees}/{alert.nbOfficinesNotifiees}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/institutions/dpmed/pharmacovigilance">
          <Card className="border-teal-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-teal-800">Pharmacovigilance</h3>
                <p className="text-xs text-muted-foreground">Signalements EI et surveillance</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/institutions/dpmed/conformite">
          <Card className="border-teal-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-teal-800">Conformité</h3>
                <p className="text-xs text-muted-foreground">Scores et certifications</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/institutions/dpmed/alertes">
          <Card className="border-teal-200 hover:border-teal-400 hover:shadow-md transition-all cursor-pointer">
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-teal-800">Historique alertes</h3>
                <p className="text-xs text-muted-foreground">Toutes les alertes DPMED</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
