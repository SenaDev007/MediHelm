'use client'

// ============================================================
// MediHelm Grossiste — Module G02 · Gestion des Lots Entrepôt
// Réception des lots, FEFO visuel, quarantaine, destructions (PV DPMED)
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import {
  Boxes,
  Plus,
  Loader2,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  Package,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

interface Lot {
  id: string
  numeroLot: string
  quantite: number
  dateExpiration: string
  emplacement: string | null
  statut: string
  motifStatut: string | null
  produit: { id: string; dci: string; nomCommercial: string; forme: string; dosage: string }
}

interface Stats {
  totalLots: number
  totalUnitesDisponibles: number
  lotsExpirés: number
  lotsExpirant90j: number
  enQuarantaine: number
}

const STATUT_STYLE: Record<string, string> = {
  DISPONIBLE: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  QUARANTAINE: 'bg-amber-100 text-amber-800 border-amber-300',
  DETRUIT: 'bg-gray-100 text-gray-600 border-gray-300',
}

export default function LotsPage() {
  const [lots, setLots] = useState<Lot[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [produits, setProduits] = useState<Array<{ id: string; dci: string; nomCommercial: string }>>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ produitId: '', numeroLot: '', quantite: '', dateExpiration: '', emplacement: '' })

  const fetchLots = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/grossistes/lots')
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de chargement')
        return
      }
      setLots(json.lots ?? [])
      setStats(json.stats ?? null)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLots()
    // Produits du catalogue pour le formulaire de réception
    fetch('/api/grossistes/catalogue')
      .then((r) => r.json())
      .then((d) => setProduits(Array.isArray(d) ? d : d.data ?? []))
      .catch(() => {})
  }, [fetchLots])

  async function recevoirLot() {
    if (!form.produitId || !form.numeroLot || !form.quantite || !form.dateExpiration) {
      toast.error('Tous les champs marqués * sont requis')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/grossistes/lots', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          produitId: form.produitId,
          numeroLot: form.numeroLot,
          quantite: Number(form.quantite),
          dateExpiration: form.dateExpiration,
          emplacement: form.emplacement || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de réception')
        return
      }
      toast.success(`Lot ${form.numeroLot} réceptionné (${form.quantite} unités)`)
      setDialogOpen(false)
      setForm({ produitId: '', numeroLot: '', quantite: '', dateExpiration: '', emplacement: '' })
      fetchLots()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  async function changerStatut(lot: Lot, statut: string) {
    const motif = statut === 'DISPONIBLE'
      ? undefined
      : statut === 'DETRUIT'
        ? prompt(`Motif de destruction (PV DPMED) pour le lot ${lot.numeroLot} :`)
        : prompt(`Motif de mise en quarantaine pour le lot ${lot.numeroLot} :`)
    if (statut !== 'DISPONIBLE' && !motif) return
    try {
      const res = await fetch(`/api/grossistes/lots/${lot.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ statut, motif }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur')
        return
      }
      if (statut === 'DETRUIT' && json.pvDestruction) {
        toast.success(`Lot détruit — PV à déclarer au DPMED (${json.pvDestruction.quantiteDetruite} unités)`)
      } else {
        toast.success(`Lot ${lot.numeroLot} → ${statut}`)
      }
      fetchLots()
    } catch {
      toast.error('Erreur réseau')
    }
  }

  const joursAvant = (d: string) =>
    Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Boxes className="w-6 h-6 text-teal-700" />
            Lots Entrepôt
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            G02 — Réception des lots, quarantaine, destructions avec PV (déclaration DPMED). Tri FEFO automatique.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="bg-teal-700 hover:bg-teal-800">
          <Plus className="w-4 h-4 mr-2" />
          Réceptionner un lot
        </Button>
      </div>

      {/* KPI */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Lots</p>
            <p className="text-2xl font-bold">{stats.totalLots}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Unités disponibles</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.totalUnitesDisponibles.toLocaleString('fr-FR')}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expirés</p>
            <p className="text-2xl font-bold text-red-700">{stats.lotsExpirés}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Expirent ≤ 90 j</p>
            <p className="text-2xl font-bold text-amber-700">{stats.lotsExpirant90j}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">En quarantaine</p>
            <p className="text-2xl font-bold text-amber-700">{stats.enQuarantaine}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Lots en entrepôt — ordre FEFO (expiration la plus proche d&apos;abord)</CardTitle>
          <CardDescription>Un lot en quarantaine ne peut pas être prélevé au picking (G04)</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : lots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Boxes className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Aucun lot en entrepôt</p>
              <p className="text-sm text-muted-foreground mt-1">Réceptionnez vos premiers lots de catalogue</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>N° lot</TableHead>
                    <TableHead>Quantité</TableHead>
                    <TableHead>Expiration</TableHead>
                    <TableHead>Emplacement</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lots.map((l) => {
                    const j = joursAvant(l.dateExpiration)
                    const expireBientot = l.statut === 'DISPONIBLE' && j <= 90
                    return (
                      <TableRow key={l.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{l.produit.nomCommercial}</p>
                          <p className="text-xs text-muted-foreground">{l.produit.dci} · {l.produit.dosage}</p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{l.numeroLot}</TableCell>
                        <TableCell className="font-semibold">{l.quantite}</TableCell>
                        <TableCell>
                          <span className={`text-xs ${j < 0 ? 'text-red-700 font-bold' : expireBientot ? 'text-amber-700 font-semibold' : ''}`}>
                            {new Date(l.dateExpiration).toLocaleDateString('fr-FR')}
                            {j >= 0 && <span className="text-muted-foreground"> ({j} j)</span>}
                            {j < 0 && <span> (expiré)</span>}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{l.emplacement ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className={STATUT_STYLE[l.statut] ?? ''}>{l.statut}</Badge>
                          {l.motifStatut && <p className="text-[10px] text-muted-foreground mt-1 max-w-32 truncate" title={l.motifStatut}>{l.motifStatut}</p>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {l.statut === 'DISPONIBLE' && (
                              <Button variant="outline" size="icon" title="Mettre en quarantaine" onClick={() => changerStatut(l, 'QUARANTAINE')}>
                                <ShieldAlert className="w-4 h-4 text-amber-600" />
                              </Button>
                            )}
                            {l.statut === 'QUARANTAINE' && (
                              <>
                                <Button variant="outline" size="icon" title="Libérer (retour disponible)" onClick={() => changerStatut(l, 'DISPONIBLE')}>
                                  <Package className="w-4 h-4 text-emerald-600" />
                                </Button>
                                <Button variant="outline" size="icon" title="Détruire (PV DPMED)" onClick={() => changerStatut(l, 'DETRUIT')}>
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog réception */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Réception d&apos;un lot</DialogTitle>
            <DialogDescription>Le stock du produit est incrémenté automatiquement</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Produit *</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.produitId}
                onChange={(e) => setForm((f) => ({ ...f, produitId: e.target.value }))}
              >
                <option value="">— Choisir un produit du catalogue —</option>
                {produits.map((p) => (
                  <option key={p.id} value={p.id}>{p.nomCommercial} — {p.dci}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>N° de lot *</Label>
                <Input value={form.numeroLot} onChange={(e) => setForm((f) => ({ ...f, numeroLot: e.target.value }))} placeholder="BN24-0441" />
              </div>
              <div className="space-y-2">
                <Label>Quantité *</Label>
                <Input type="number" min={1} value={form.quantite} onChange={(e) => setForm((f) => ({ ...f, quantite: e.target.value }))} placeholder="100" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date d&apos;expiration *</Label>
                <Input type="date" value={form.dateExpiration} onChange={(e) => setForm((f) => ({ ...f, dateExpiration: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Emplacement</Label>
                <Input value={form.emplacement} onChange={(e) => setForm((f) => ({ ...f, emplacement: e.target.value }))} placeholder="Allée B · Rack 3" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Les lots déjà expirés sont refusés — procédure de destruction directe requise.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={recevoirLot} disabled={submitting} className="bg-teal-700 hover:bg-teal-800">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Réceptionner
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
