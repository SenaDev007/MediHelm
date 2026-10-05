'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Truck,
  CheckCircle2,
  Clock,
  Package,
  BarChart3,
  Loader2,
  Map,
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
} from 'recharts'

interface Confirmation {
  id: string
  dateReception: string
  statut: string
  notes: string | null
  pharmacie: {
    id: string
    nom: string
    ville: string
  }
  ordonnanceGrossiste: {
    id: string
    reference: string
    montantTotal: number
  }
}

interface SoBAPSData {
  kpis: {
    totalCommandes: number
    commandesEnvoyees: number
    commandesConfirmees: number
    commandesLivrees: number
    commandesEnPreparation: number
    totalReceptions: number
    receptionsCompletes: number
    receptionsPartielles: number
    tauxLivraison: number
  }
  monthlyTrend: Array<{ mois: string; commandes: number; livrees: number; montant: number }>
  recentConfirmations: Confirmation[]
  topPharmacies: Array<{ id: string; nom: string; ville: string; count: number; montant: number }>
}

const STATUT_COLORS: Record<string, string> = {
  COMPLETE: 'bg-green-100 text-green-800',
  PARTIELLE: 'bg-amber-100 text-amber-800',
}

const STATUT_LABELS: Record<string, string> = {
  COMPLETE: 'Complète',
  PARTIELLE: 'Partielle',
}

export default function SoBAPSDashboard() {
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
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <Truck className="h-7 w-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-teal-800">Tableau de bord SoBAPS</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse border-teal-200">
              <CardContent className="p-6"><div className="h-20 bg-teal-50 rounded" /></CardContent>
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
          <p className="text-muted-foreground">Aucune donnée disponible.</p>
        </Card>
      </div>
    )
  }

  const { kpis, monthlyTrend, recentConfirmations, topPharmacies } = data

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <Truck className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-800">Tableau de bord SoBAPS</h1>
            <p className="text-sm text-muted-foreground">Société Béninoise d&apos;Approvisionnement Pharmaceutique</p>
          </div>
        </div>
        <Link href="/institutions/sobaps/carte">
          <Button variant="outline" className="border-teal-300 text-teal-700">
            <Map className="h-4 w-4 mr-2" />
            Carte des officines
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-teal-200 border-l-4 border-l-teal-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total commandes</p>
                <p className="text-3xl font-bold text-teal-800">{kpis.totalCommandes}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center">
                <Package className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">En préparation</p>
                <p className="text-3xl font-bold text-amber-600">{kpis.commandesEnPreparation}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Livrées</p>
                <p className="text-3xl font-bold text-green-700">{kpis.commandesLivrees}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <Progress value={kpis.tauxLivraison} className="mt-2 h-2 [&>div]:bg-green-500" />
            <p className="text-xs text-muted-foreground mt-1">Taux : {kpis.tauxLivraison}%</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Réceptions</p>
                <p className="text-3xl font-bold text-blue-700">{kpis.totalReceptions}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                <Truck className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.receptionsCompletes} complètes · {kpis.receptionsPartielles} partielles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card className="border-teal-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-teal-800">Tendance mensuelle</CardTitle>
          <CardDescription>Commandes et livraisons sur 6 mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #9FE1CB', borderRadius: '8px' }} />
                <Bar dataKey="commandes" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Commandes" />
                <Bar dataKey="livrees" fill="#9FE1CB" radius={[4, 4, 0, 0]} name="Livrées" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Confirmations + Top Pharmacies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Confirmations */}
        <Card className="lg:col-span-2 border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Confirmations récentes</CardTitle>
            <CardDescription>Dernières réceptions confirmées</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Pharmacie</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentConfirmations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Aucune confirmation récente
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentConfirmations.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-xs">{c.ordonnanceGrossiste.reference}</TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{c.pharmacie.nom}</div>
                          <div className="text-xs text-muted-foreground">{c.pharmacie.ville}</div>
                        </TableCell>
                        <TableCell className="text-sm font-semibold text-teal-600">
                          {new Intl.NumberFormat('fr-FR').format(c.ordonnanceGrossiste.montantTotal)} FCFA
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUT_COLORS[c.statut] || 'bg-gray-100 text-gray-800'}>
                            {STATUT_LABELS[c.statut] || c.statut}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.dateReception).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Top Pharmacies */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Meilleures pharmacies</CardTitle>
            <CardDescription>Par volume de commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPharmacies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune pharmacie</p>
              ) : (
                topPharmacies.map((pharma, index) => (
                  <div key={pharma.id} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? 'bg-teal-600' : index === 1 ? 'bg-teal-500' : index === 2 ? 'bg-amber-500' : 'bg-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pharma.nom}</p>
                      <p className="text-xs text-muted-foreground">{pharma.ville} · {pharma.count} commande(s)</p>
                    </div>
                    <p className="text-sm font-semibold text-teal-600">
                      {new Intl.NumberFormat('fr-FR').format(pharma.montant)} F
                    </p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
