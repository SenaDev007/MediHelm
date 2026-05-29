'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3,
  MapPin,
  AlertTriangle,
  Loader2,
  Shield,
  Download,
  Building2,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

const PLAN_COLORS: Record<string, string> = {
  SEED: '#1D9E75',
  GROW: '#0F6E56',
  LEAD: '#EF9F27',
  NETWORK: '#378ADD',
}

const PLAN_LABELS: Record<string, string> = {
  SEED: 'Seed',
  GROW: 'Grow',
  LEAD: 'Lead',
  NETWORK: 'Network',
}

const SURV_TYPE_LABELS: Record<string, string> = {
  CONTREFACON: 'Contrefaçon',
  NON_CONFORME: 'Non conforme',
  RAPPEL_LOT: 'Rappel de lot',
  AMM_SUSPENDUE: 'AMM suspendue',
  SOUS_SURVEILLANCE: 'Sous surveillance',
}

const GRAVITE_LABELS: Record<string, string> = {
  LEGER: 'Léger',
  MODERE: 'Modéré',
  GRAVE: 'Grave',
  FATAL: 'Fatal',
}

const GRAVITE_COLORS: Record<string, string> = {
  LEGER: '#1D9E75',
  MODERE: '#EF9F27',
  GRAVE: '#E24B4A',
  FATAL: '#7C2D12',
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM Suspendue',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
  INFO_REGLEMENTAIRE: 'Info réglementaire',
}

interface ABRPData {
  pharmacies: {
    total: number
    parVille: { ville: string; count: number }[]
    parDepartement: { departement: string; count: number }[]
    parPlan: { plan: string; count: number }[]
  }
  tensions: {
    alertesActives: number
    parTypeSurveillance: { type: string; count: number }[]
    alertesDPMEDParType: { type: string; count: number }[]
  }
  pharmacovigilance: {
    signalementsParGravite: { gravite: string; count: number }[]
  }
  conformite: {
    scoreMoyen: number
    nbEvalues: number
  }
  distribution: {
    totalConfirmations: number
    parStatut: { statut: string; count: number }[]
  }
}

export default function ABRPPage() {
  const [data, setData] = useState<ABRPData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/institutions/abrp/analytics')
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
        <span className="ml-3 text-muted-foreground">Chargement du portail ABRP...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Portail ABRP
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Association Béninoise des Pharmaciens — Données anonymisées et analytics marché
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info('Export en préparation...')} className="border-teal-300 text-teal-700">
          <Download className="h-4 w-4 mr-1" />
          Exporter rapport
        </Button>
      </div>

      {/* Data Privacy Notice */}
      <Card className="border-amber-200 bg-amber-50/50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Données anonymisées</p>
              <p className="text-xs text-amber-700 mt-1">
                Ce portail affiche uniquement des données agrégées et anonymisées. Aucune donnée individuelle
                de pharmacie ou de patient n&apos;est accessible. Conformément aux réglementations sur la protection des données.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              Pharmacies
            </div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{data?.pharmacies.total || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Alertes actives
            </div>
            <div className="text-2xl font-bold text-red-700 mt-1">{data?.tensions.alertesActives || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Score moyen conformité
            </div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{data?.conformite.scoreMoyen || 0}%</div>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Confirmations réception</div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{data?.distribution.totalConfirmations || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Pharmacies évaluées</div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{data?.conformite.nbEvalues || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 - Pharmacy Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By City */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-4 w-4 text-teal-600" />
              Distribution par ville
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.pharmacies.parVille.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.pharmacies.parVille.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="ville" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Pharmacies" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Plan */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par plan tarifaire</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.pharmacies.parPlan.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.pharmacies.parPlan.map(p => ({
                      name: PLAN_LABELS[p.plan] || p.plan,
                      value: p.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.pharmacies.parPlan.map((entry, index) => (
                      <Cell key={index} fill={PLAN_COLORS[entry.plan] || '#1D9E75'} />
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
      </div>

      {/* Charts Row 2 - Supply Tensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Surveillance Types */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Tensions d&apos;approvisionnement
            </CardTitle>
            <CardDescription>Par type de surveillance active</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.tensions.parTypeSurveillance.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.tensions.parTypeSurveillance.map(t => ({
                  name: SURV_TYPE_LABELS[t.type] || t.type,
                  count: t.count,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#EF9F27" radius={[4, 4, 0, 0]} name="Alertes" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune tension signalée
              </div>
            )}
          </CardContent>
        </Card>

        {/* DPMED Alert Types */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alertes DPMED par type</CardTitle>
            <CardDescription>Données agrégées anonymisées</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.tensions.alertesDPMEDParType.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.tensions.alertesDPMEDParType.map(a => ({
                      name: ALERT_TYPE_LABELS[a.type] || a.type,
                      value: a.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {data.tensions.alertesDPMEDParType.map((_, index) => (
                      <Cell key={index} fill={['#E24B4A', '#EF9F27', '#378ADD', '#9333EA', '#1D9E75'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune alerte DPMED
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pharmacovigilance Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pharmacovigilance — Gravité des EI</CardTitle>
            <CardDescription>Signalements par gravité (anonymisés)</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.pharmacovigilance.signalementsParGravite.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.pharmacovigilance.signalementsParGravite.map(s => ({
                  name: GRAVITE_LABELS[s.gravite] || s.gravite,
                  count: s.count,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {data.pharmacovigilance.signalementsParGravite.map((entry, index) => (
                      <Cell key={index} fill={GRAVITE_COLORS[entry.gravite] || '#1D9E75'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucun signalement
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distribution stats */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribution — Statut des réceptions</CardTitle>
            <CardDescription>Confirmations de réception SoBAPS</CardDescription>
          </CardHeader>
          <CardContent>
            {data && data.distribution.parStatut.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.distribution.parStatut.map(s => ({
                      name: s.statut === 'CONFORME' ? 'Conforme' : s.statut === 'AVEC_ECART' ? 'Avec écart' : 'Refusé',
                      value: s.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="#1D9E75" />
                    <Cell fill="#EF9F27" />
                    <Cell fill="#E24B4A" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée de distribution
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Department Distribution */}
      <Card className="border-teal-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4 text-teal-600" />
            Distribution géographique des pharmacies par département
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data && data.pharmacies.parDepartement.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {data.pharmacies.parDepartement.map((d) => (
                <div
                  key={d.departement}
                  className="p-3 rounded-lg border border-teal-200 bg-teal-50/30 text-center"
                >
                  <div className="text-lg font-bold text-teal-800">{d.count}</div>
                  <div className="text-xs text-muted-foreground">{d.departement}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm py-8">
              Aucune donnée géographique
            </div>
          )}
        </CardContent>
      </Card>

      {/* Market Overview Table */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="text-base">Aperçu marché pharmaceutique</CardTitle>
          <CardDescription>Résumé anonymisé des données du réseau MédiHelm</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border border-teal-200">
              <p className="text-xs text-muted-foreground">Pharmacies actives</p>
              <p className="text-xl font-bold text-teal-800">{data?.pharmacies.total || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Réseau MédiHelm Bénin</p>
            </div>
            <div className="p-4 rounded-lg border border-teal-200">
              <p className="text-xs text-muted-foreground">Score conformité moyen</p>
              <p className="text-xl font-bold text-teal-800">{data?.conformite.scoreMoyen || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">{data?.conformite.nbEvalues || 0} évaluées</p>
            </div>
            <div className="p-4 rounded-lg border border-teal-200">
              <p className="text-xs text-muted-foreground">Alertes sanitaires actives</p>
              <p className="text-xl font-bold text-red-700">{data?.tensions.alertesActives || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Nécessitant attention</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
