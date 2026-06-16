'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Building2,
  Truck,
  Users,
  CreditCard,
  AlertTriangle,
  Activity,
  Server,
  Shield,
  ScrollText,
} from 'lucide-react'
import { useEffect, useState } from 'react'
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
  pharmacies: {
    total: number
    actives: number
    parPlan: { plan: string; count: number }[]
  }
  grossistes: {
    total: number
    actifs: number
  }
  utilisateurs: {
    total: number
    parRole: { role: string; count: number }[]
  }
  abonnements: {
    actifs: number
    expires: number
    suspendus: number
    revenuMensuel: number
  }
  alertesDPMED: {
    total: number
    enDiffusion: number
    recentes: {
      id: string
      titre: string
      typeAlerte: string
      niveauUrgence: string
      statut: string
      nbDiffusions: number
      createdAt: string
    }[]
  }
  recentAudits: {
    id: string
    userId: string | null
    action: string
    entity: string
    entityId: string | null
    details: string | null
    createdAt: string
  }[]
  sante: {
    api: string
    db: string
    storage: string
  }
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const PLAN_COLORS: Record<string, string> = {
  SEED: '#10b981',
  BLOOM: '#3b82f6',
  CROWN: '#f59e0b',
  NETWORK: '#8b5cf6',
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  const planChartData = data?.pharmacies.parPlan.map(p => ({
    name: p.plan,
    value: p.count,
  })) || []

  const roleChartData = data?.utilisateurs.parRole.map(r => ({
    name: r.role,
    count: r.count,
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground">Vue d&apos;ensemble de la plateforme MediHelm</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pharmacies</span>
                <span className="text-2xl font-bold tracking-tight">{data?.pharmacies.total ?? 0}</span>
                <span className="text-xs text-muted-foreground">{data?.pharmacies.actives ?? 0} actives</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-600/10 text-teal-600">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grossistes</span>
                <span className="text-2xl font-bold tracking-tight">{data?.grossistes.total ?? 0}</span>
                <span className="text-xs text-muted-foreground">{data?.grossistes.actifs ?? 0} actifs</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500">
                <Truck className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Utilisateurs</span>
                <span className="text-2xl font-bold tracking-tight">{data?.utilisateurs.total ?? 0}</span>
                <span className="text-xs text-muted-foreground">tous rôles confondus</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenu mensuel</span>
                <span className="text-2xl font-bold tracking-tight">{formatFCFA(data?.abonnements.revenuMensuel ?? 0)}</span>
                <span className="text-xs text-muted-foreground">{data?.abonnements.actifs ?? 0} abonnements actifs</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10 text-green-500">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-600" />
              Distribution par plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {planChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée disponible</p>
            ) : (
              <div className="h-52 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {planChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PLAN_COLORS[entry.name] || '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Users by Role */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Utilisateurs par rôle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {roleChartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée disponible</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roleChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #E1F5EE)" />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="#888780" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} stroke="#888780" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="count" fill="#1D9E75" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts + System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* DPMED Alerts Summary */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-destructive" />
              Alertes DPMED
              <Badge variant="destructive" className="text-[10px]">{data?.alertesDPMED.enDiffusion ?? 0} en diffusion</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              {(data?.alertesDPMED.recentes?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune alerte DPMED</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data?.alertesDPMED.recentes.map(a => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{a.titre}</span>
                        <span className="text-xs text-muted-foreground">{a.typeAlerte} · {a.nbDiffusions} diffusions</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={a.niveauUrgence === 'CRITIQUE' ? 'destructive' : a.niveauUrgence === 'URGENT' ? 'outline' : 'secondary'}
                          className="text-[10px]"
                        >
                          {a.niveauUrgence}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* System Health */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Santé du système
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {[
                { label: 'API', status: data?.sante.api },
                { label: 'Base de données', status: data?.sante.db },
                { label: 'Stockage', status: data?.sante.storage },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <span className="text-sm">{item.label}</span>
                  <Badge
                    variant={item.status === 'OPÉRATIONNEL' || item.status === 'CONNECTÉ' || item.status === 'NORMAL' ? 'default' : 'destructive'}
                    className="text-[10px]"
                  >
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Audit Logs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-muted-foreground" />
            Audit logs récents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-64">
            {(data?.recentAudits?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun log récent</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data?.recentAudits.map(a => (
                  <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] shrink-0">{a.action}</Badge>
                      <span className="text-sm">{a.entity}{a.entityId ? ` · ${a.entityId.slice(0, 8)}...` : ''}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
