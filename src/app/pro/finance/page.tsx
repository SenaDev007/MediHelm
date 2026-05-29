'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Banknote, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

interface VenteData {
  id: string
  montantTotal: number
  montantPaye: number
  typeVente: string
  statut: string
  createdAt: string
  paiements: { modePaiement: string; montant: number }[]
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

export default function FinancePage() {
  const { pharmacie } = useAuth()
  const [ventes, setVentes] = useState<VenteData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      fetch(`/api/ventes?pharmacieId=${pharmacie.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setVentes(data))
        .catch(() => setVentes([]))
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const totalCA = ventes.filter(v => v.statut === 'VALIDEE').reduce((s, v) => s + v.montantTotal, 0)
  const totalPaye = ventes.filter(v => v.statut === 'VALIDEE').reduce((s, v) => s + v.montantPaye, 0)
  const totalImpaye = totalCA - totalPaye

  // Group by payment mode
  const paymentModeData = (() => {
    const map = new Map<string, number>()
    for (const v of ventes) {
      if (v.statut !== 'VALIDEE') continue
      for (const p of v.paiements) {
        map.set(p.modePaiement, (map.get(p.modePaiement) || 0) + p.montant)
      }
    }
    return Array.from(map.entries()).map(([name, montant]) => ({
      name: name.replace(/_/g, ' '),
      montant,
    }))
  })()

  // Daily CA for last 14 days
  const dailyCAData = (() => {
    const map = new Map<string, number>()
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      map.set(key, 0)
    }
    for (const v of ventes) {
      if (v.statut !== 'VALIDEE') continue
      const key = new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + v.montantTotal)
      }
    }
    return Array.from(map.entries()).map(([name, ca]) => ({ name, ca }))
  })()

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[1,2,3].map(i=><Skeleton key={i} className="h-24" />)}</div><Skeleton className="h-64" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Banknote className="w-6 h-6 text-primary" />
          Finance
        </h1>
        <p className="text-sm text-muted-foreground">Rapports financiers et trésorerie</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase">CA total</span>
              <span className="text-xl font-bold block text-primary">{formatFCFA(totalCA)}</span>
            </div>
            <TrendingUp className="w-8 h-8 text-primary/30" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase">Total encaissé</span>
              <span className="text-xl font-bold block">{formatFCFA(totalPaye)}</span>
            </div>
            <Wallet className="w-8 h-8 text-primary/30" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase">Impayés</span>
              <span className="text-xl font-bold block text-destructive">{formatFCFA(totalImpaye)}</span>
            </div>
            <TrendingDown className="w-8 h-8 text-destructive/30" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">CA quotidien — 14 derniers jours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyCAData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#888780" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#888780" />
                  <Tooltip formatter={(value: number) => [formatFCFA(value), 'CA']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="ca" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Répartition par mode de paiement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentModeData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#888780" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} stroke="#888780" />
                  <Tooltip formatter={(value: number) => [formatFCFA(value), 'Montant']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="montant" fill="#0F6E56" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Détail des dernières ventes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-3 text-xs font-medium text-muted-foreground">Type</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Montant</th>
                  <th className="text-right p-3 text-xs font-medium text-muted-foreground">Payé</th>
                  <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                </tr>
              </thead>
              <tbody>
                {ventes.slice(0, 20).map(v => (
                  <tr key={v.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 text-sm">{new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-3 text-sm">{v.typeVente}</td>
                    <td className="p-3 text-sm text-right font-semibold">{formatFCFA(v.montantTotal)}</td>
                    <td className="p-3 text-sm text-right">{formatFCFA(v.montantPaye)}</td>
                    <td className="p-3 text-center"><Badge variant={v.statut === 'VALIDEE' ? 'default' : 'outline'} className="text-[10px]">{v.statut}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
