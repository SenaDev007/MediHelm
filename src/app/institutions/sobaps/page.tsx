'use client'

import { useState, useEffect } from 'react'
import {
  Truck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  Package,
  MapPin,
  Download,
  TrendingUp,
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
  LineChart,
  Line,
} from 'recharts'
import { toast } from 'sonner'

const STATUT_LABELS: Record<string, string> = {
  CONFORME: 'Conforme',
  AVEC_ECART: 'Avec écart',
  REFUSE: 'Refusé',
}

const STATUT_COLORS: Record<string, string> = {
  CONFORME: 'bg-green-100 text-green-800 border-green-300',
  AVEC_ECART: 'bg-amber-100 text-amber-800 border-amber-300',
  REFUSE: 'bg-red-100 text-red-800 border-red-300',
}

interface SoBAPSData {
  total: number
  conformes: number
  avecEcart: number
  refus: number
  tauxConformite: number
  recentConfirmations: Array<{
    id: string
    pharmacieId: string
    bonLivraisonRef: string
    dateReception: string
    statut: string
    ecarts: unknown
    pharmacie?: { id: string; nom: string; ville: string }
  }>
  parPharmacie: Array<{
    pharmacieId: string
    pharmacie: string
    ville: string
    count: number
  }>
  dailyStats: Array<{
    date: string
    conformes: number
    ecarts: number
    refus: number
  }>
}

export default function SoBAPSPage() {
  const [data, setData] = useState<SoBAPSData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/institutions/sobaps/dashboard')
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
        <span className="ml-3 text-muted-foreground">Chargement du portail SoBAPS...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
            <Truck className="h-6 w-6" />
            Portail SoBAPS
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Société Béninoise d&apos;Approvisionnement Pharmaceutique — Suivi des livraisons et réceptions
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info('Export en préparation...')} className="border-teal-300 text-teal-700">
          <Download className="h-4 w-4 mr-1" />
          Exporter rapport
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Total réceptions
            </div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Conformes
            </div>
            <div className="text-2xl font-bold text-green-700 mt-1">{data?.conformes || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Avec écart
            </div>
            <div className="text-2xl font-bold text-amber-700 mt-1">{data?.avecEcart || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-red-600">
              <XCircle className="h-4 w-4" />
              Refusées
            </div>
            <div className="text-2xl font-bold text-red-700 mt-1">{data?.refus || 0}</div>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              Taux conformité
            </div>
            <div className="text-2xl font-bold text-teal-800 mt-1">{data?.tauxConformite || 0}%</div>
            <Progress value={data?.tauxConformite || 0} className="mt-1 h-1.5" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily stats */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Évolution des réceptions (30 jours)</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={data.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="conformes" stroke="#1D9E75" name="Conformes" />
                  <Line type="monotone" dataKey="ecarts" stroke="#EF9F27" name="Avec écart" />
                  <Line type="monotone" dataKey="refus" stroke="#E24B4A" name="Refusées" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top pharmacies */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Réceptions par pharmacie</CardTitle>
          </CardHeader>
          <CardContent>
            {data && data.parPharmacie.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.parPharmacie.slice(0, 8)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="pharmacie" type="category" tick={{ fontSize: 9 }} width={120} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1D9E75" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Confirmations Table */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-teal-600" />
            Confirmations de réception récentes
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bon de livraison</TableHead>
                  <TableHead>Pharmacie</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Date réception</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data && data.recentConfirmations.length > 0 ? (
                  data.recentConfirmations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-mono text-sm">{c.bonLivraisonRef}</TableCell>
                      <TableCell className="text-sm font-medium">
                        {c.pharmacie?.nom || 'Inconnue'}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          {c.pharmacie?.ville || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(c.dateReception).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${STATUT_COLORS[c.statut] || ''}`}>
                          {STATUT_LABELS[c.statut] || c.statut}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aucune confirmation de réception
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Supply Chain Summary */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="text-base">Visibilité chaîne d&apos;approvisionnement</CardTitle>
          <CardDescription>Vue d&apos;ensemble du processus logistique</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {[
              { label: 'Commande émise', icon: <Package className="h-6 w-6" />, color: 'text-blue-600 bg-blue-50' },
              { label: 'En préparation', icon: <Truck className="h-6 w-6" />, color: 'text-amber-600 bg-amber-50' },
              { label: 'En livraison', icon: <Truck className="h-6 w-6" />, color: 'text-orange-600 bg-orange-50' },
              { label: 'Réception confirmée', icon: <CheckCircle2 className="h-6 w-6" />, color: 'text-green-600 bg-green-50' },
            ].map((step, i) => (
              <div key={i} className="flex flex-col items-center gap-2 text-center">
                <div className={`h-14 w-14 rounded-full flex items-center justify-center ${step.color}`}>
                  {step.icon}
                </div>
                <p className="text-xs font-medium">{step.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
