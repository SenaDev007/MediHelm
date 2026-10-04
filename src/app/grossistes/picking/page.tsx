'use client'

// ============================================================
// MediHelm Grossiste — Module G04 · Picking & Préparation
// Bons de picking FEFO, scan de confirmation, alertes quarantaine
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import {
  ClipboardList,
  Loader2,
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  PackageOpen,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Prelevement {
  lotId: string
  numeroLot: string
  quantite: number
  dateExpiration: string
  emplacement: string | null
  scanne?: boolean
}

interface LignePicking {
  ligneId: string
  dci: string
  nomCommercial: string | null
  aPrelever: number
  prelevements: Prelevement[]
  manquant: number
  alerteQuarantaine: boolean
}

interface Bon {
  id: string
  commandeId: string
  statut: string
  scanConfirme: boolean
  createdAt: string
  lignes: LignePicking[]
  commande: { reference: string; statut: string; montantTotal: number }
  pharmacie: { nom: string; ville: string | null; adresse: string | null } | null
  nbLignes: number
}

export default function PickingPage() {
  const [bons, setBons] = useState<Bon[]>([])
  const [stats, setStats] = useState<{ enAttente: number; prets: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [bonOuvert, setBonOuvert] = useState<Bon | null>(null)
  const [busy, setBusy] = useState(false)

  const fetchBons = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/grossistes/picking')
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de chargement')
        return
      }
      setBons(json.bons ?? [])
      setStats(json.stats ?? null)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBons()
  }, [fetchBons])

  async function scanner(bon: Bon, ligne: LignePicking, prev: Prelevement) {
    setBusy(true)
    try {
      const res = await fetch(`/api/grossistes/picking/${bon.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'SCAN', ligneId: ligne.ligneId, lotId: prev.lotId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de scan')
        return
      }
      // Rafraîchit localement le bon ouvert
      setBonOuvert((b) => {
        if (!b) return b
        const lignes = b.lignes.map((l) => ({
          ...l,
          prelevements: l.prelevements.map((p) =>
            p.lotId === prev.lotId && l.ligneId === ligne.ligneId ? { ...p, scanne: true } : p
          ),
        }))
        return { ...b, lignes }
      })
      toast.success(`Lot ${prev.numeroLot} scanné — ${json.reste} prélèvement(s) restant(s)`)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setBusy(false)
    }
  }

  async function terminer(bon: Bon) {
    if (!confirm('Clôturer le bon de picking ? Les stocks des lots seront décrémentés.')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/grossistes/picking/${bon.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'TERMINER' }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur')
        return
      }
      toast.success(json.message ?? 'Bon clôturé')
      setBonOuvert(null)
      fetchBons()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-teal-700" />
          Picking & Préparation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          G04 — Bons de picking générés à la confirmation des commandes. Sélection FEFO automatique,
          lots en quarantaine exclus, scan de chaque boîte pour valider le prélèvement.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bons en attente</p>
            <p className="text-2xl font-bold text-amber-700">{stats.enAttente}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Bons prêts</p>
            <p className="text-2xl font-bold text-emerald-700">{stats.prets}</p>
          </CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Bons de picking</CardTitle>
          <CardDescription>
            Les bons sont créés depuis la page Commandes (G03) → action « Générer le picking »
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : bons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <PackageOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Aucun bon de picking</p>
              <p className="text-sm text-muted-foreground mt-1">
                Confirmez une commande puis générez son bon de picking
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Commande</th>
                    <th className="text-left p-3 font-medium">Officine</th>
                    <th className="text-left p-3 font-medium">Lignes</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                    <th className="text-right p-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {bons.map((b) => (
                    <tr key={b.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{b.commande.reference}</td>
                      <td className="p-3">{b.pharmacie?.nom ?? '—'}</td>
                      <td className="p-3">{b.nbLignes}</td>
                      <td className="p-3">
                        <Badge className={b.statut === 'PRET' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-amber-100 text-amber-800 border-amber-300'}>
                          {b.statut}
                        </Badge>
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => setBonOuvert(b)}>
                          Ouvrir le bon
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Détail du bon */}
      <Dialog open={!!bonOuvert} onOpenChange={(o) => !o && setBonOuvert(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {bonOuvert && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Bon de picking — {bonOuvert.commande.reference}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {bonOuvert.pharmacie?.nom}
                  </span>
                </DialogTitle>
                <DialogDescription>
                  Scanner chaque boîte pour valider le prélèvement du lot (FEFO appliqué)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                {bonOuvert.lignes.map((l) => (
                  <div key={l.ligneId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="font-semibold text-sm">{l.nomCommercial ?? l.dci}</p>
                        <p className="text-xs text-muted-foreground">{l.dci} · à prélever : {l.aPrelever}</p>
                      </div>
                      {l.alerteQuarantaine && (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                          <AlertTriangle className="w-3 h-3 mr-1" /> Lot en quarantaine exclu
                        </Badge>
                      )}
                      {l.manquant > 0 && (
                        <Badge className="bg-red-100 text-red-800 border-red-300">
                          Manquant : {l.manquant}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {l.prelevements.map((p) => (
                        <div key={p.lotId} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-xs">
                          <div>
                            <span className="font-mono">{p.numeroLot}</span>
                            <span className="text-muted-foreground ml-2">
                              exp. {new Date(p.dateExpiration).toLocaleDateString('fr-FR')}
                              {p.emplacement ? ` · ${p.emplacement}` : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{p.quantite} u.</span>
                            {bonOuvert.statut === 'EN_ATTENTE' ? (
                              p.scanne ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Button size="sm" variant="outline" disabled={busy} onClick={() => scanner(bonOuvert, l, p)}>
                                  <ScanLine className="w-3.5 h-3.5 mr-1" />
                                  Scanner
                                </Button>
                              )
                            ) : (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            )}
                          </div>
                        </div>
                      ))}
                      {l.prelevements.length === 0 && (
                        <p className="text-xs text-red-700 px-3">Aucun lot disponible pour ce produit</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {bonOuvert.statut === 'EN_ATTENTE' && (
                <div className="flex justify-end pt-2">
                  <Button onClick={() => terminer(bonOuvert)} disabled={busy} className="bg-teal-700 hover:bg-teal-800">
                    {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Clôturer le bon (PRET)
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
