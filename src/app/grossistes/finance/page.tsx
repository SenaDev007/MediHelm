'use client'

// ============================================================
// MediHelm Grossiste — Module G09 · Finance & Facturation
// CA mensuel, créances, taux de recouvrement, rapport par officine,
// export SYSCOHADA (CSV Saari/Sage/Excel)
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import {
  Wallet,
  Loader2,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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
import { toast } from 'sonner'

interface RapportOfficine {
  pharmacie: { id: string; nom: string; ville: string | null }
  commandes: number
  impayes: number
  enRetard: number
  montantDu: number
  derniereCommande: string | null
}

const fmt = (n: number) => n.toLocaleString('fr-FR') + ' FCFA'

export default function FinanceGrossistePage() {
  const now = new Date()
  const [mois, setMois] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
  const [data, setData] = useState<{
    kpi: { caMois: number; creances: number; tauxRecouvrement: number; commandesMois: number; encaisseMois: number }
    rapportOfficines: RapportOfficine[]
    tendance: Array<{ mois: string; ca: number }>
  } | null>(null)
  const [loading, setLoading] = useState(true)

  // Export SYSCOHADA
  const [exportDebut, setExportDebut] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`)
  const [exportFin, setExportFin] = useState(now.toISOString().split('T')[0])
  const [exportTva, setExportTva] = useState('0')
  const [exportTotaux, setExportTotaux] = useState<{ lignes: number; debit: number; credit: number; equilibre: boolean } | null>(null)
  const [exportLoading, setExportLoading] = useState(false)

  const fetchFinance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/grossistes/finance?mois=${mois}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de chargement')
        return
      }
      setData(json)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [mois])

  useEffect(() => {
    fetchFinance()
  }, [fetchFinance])

  async function apercuExport() {
    setExportLoading(true)
    try {
      const params = new URLSearchParams({ dateDebut: exportDebut, dateFin: exportFin, tva: exportTva })
      const res = await fetch(`/api/grossistes/exports/syscohada?${params}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de génération')
        return
      }
      setExportTotaux(json.totaux)
      toast.success(`${json.totaux.lignes} écritures générées`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setExportLoading(false)
    }
  }

  function telecharger(format: string) {
    const params = new URLSearchParams({ dateDebut: exportDebut, dateFin: exportFin, tva: exportTva, format })
    window.open(`/api/grossistes/exports/syscohada?${params}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 text-teal-700" />
            Finance & Facturation
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            G09 — CA mensuel, créances en cours, taux de recouvrement, rapport mensuel par officine
            et export SYSCOHADA pour la comptabilité du grossiste.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Mois</Label>
            <Input type="month" value={mois} onChange={(e) => setMois(e.target.value)} />
          </div>
        </div>
      </div>

      {/* KPI */}
      {loading && !data ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : data && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CA du mois</p>
            <p className="text-2xl font-bold text-emerald-700">{fmt(data.kpi.caMois)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Créances en cours</p>
            <p className="text-2xl font-bold text-amber-700">{fmt(data.kpi.creances)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Taux de recouvrement</p>
            <p className="text-2xl font-bold text-teal-700">{data.kpi.tauxRecouvrement} %</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Commandes du mois</p>
            <p className="text-2xl font-bold">{data.kpi.commandesMois}</p>
          </CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tendance CA */}
        {data && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Chiffre d&apos;affaires — 6 derniers mois</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.tendance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mois" fontSize={11} />
                  <YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <Tooltip formatter={(v: number) => fmt(v)} />
                  <Bar dataKey="ca" fill="#1D9E75" radius={[4, 4, 0, 0]} name="CA" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Export SYSCOHADA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export SYSCOHADA
            </CardTitle>
            <CardDescription>
              Journal de facturation des officines clientes — D 411 / C 701, encaissements D 5211 / C 411.
              CSV compatible Saari, Sage 100 et Excel.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Début</Label>
                <Input type="date" value={exportDebut} onChange={(e) => setExportDebut(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fin</Label>
                <Input type="date" value={exportFin} onChange={(e) => setExportFin(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">TVA</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={exportTva}
                  onChange={(e) => setExportTva(e.target.value)}
                >
                  <option value="0">0 %</option>
                  <option value="0.18">18 %</option>
                </select>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={apercuExport} disabled={exportLoading}>
              {exportLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
              Vérifier l&apos;aperçu
            </Button>

            {exportTotaux && (
              <div className="rounded-lg border p-3 text-sm space-y-1">
                <p><b>{exportTotaux.lignes}</b> écritures — débit {fmt(exportTotaux.debit)} / crédit {fmt(exportTotaux.credit)}</p>
                <p className={exportTotaux.equilibre ? 'text-emerald-700' : 'text-red-700'}>
                  {exportTotaux.equilibre ? '✓ Partie double équilibrée' : '✗ Déséquilibre détecté !'}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => telecharger('csv-simple')}>
                <Download className="w-4 h-4 mr-1" /> Journal CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => telecharger('csv-double')}>
                <Download className="w-4 h-4 mr-1" /> Détaillé (Sage)
              </Button>
              <Button variant="outline" size="sm" onClick={() => telecharger('csv-balance')}>
                <Download className="w-4 h-4 mr-1" /> Balance
              </Button>
              <Button size="sm" onClick={() => telecharger('excel')} className="bg-emerald-600 hover:bg-emerald-700">
                <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rapport mensuel par officine */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Rapport mensuel par officine</CardTitle>
            <CardDescription>Historique commandes, montants dus et retards (&gt; 30 jours)</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {data.rapportOfficines.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Building2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Aucune commande non soldée — aucune créance en cours</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Officine</TableHead>
                      <TableHead>Commandes</TableHead>
                      <TableHead>Impayés</TableHead>
                      <TableHead>Montant dû</TableHead>
                      <TableHead>En retard</TableHead>
                      <TableHead>Dernière commande</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rapportOfficines.map((r) => (
                      <TableRow key={r.pharmacie.id}>
                        <TableCell className="font-medium text-sm">{r.pharmacie.nom}</TableCell>
                        <TableCell>{r.commandes}</TableCell>
                        <TableCell>{r.impayes}</TableCell>
                        <TableCell className="font-semibold text-amber-700">{fmt(r.montantDu)}</TableCell>
                        <TableCell>
                          {r.enRetard > 0 ? (
                            <Badge className="bg-red-100 text-red-800 border-red-300">{r.enRetard}</Badge>
                          ) : (
                            <span className="text-xs text-emerald-600">à jour</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.derniereCommande ? new Date(r.derniereCommande).toLocaleDateString('fr-FR') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
