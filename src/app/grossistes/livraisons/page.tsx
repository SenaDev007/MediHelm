'use client'

// ============================================================
// MediHelm Grossiste — Module G05 · Livraisons
// Planning, suivi PLANIFIEE→EN_ROUTE→LIVREE/LITIGE/ECHEC,
// signature électronique, bordereau PDF
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import {
  Truck,
  Loader2,
  FileDown,
  MapPin,
  PlayCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
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
import { toast } from 'sonner'

interface Livraison {
  id: string
  statut: string
  planning: string | null
  livreurId: string | null
  signatureElectronique: string | null
  pharmacie: { nom: string; ville: string | null; adresse: string | null; telephone: string } | null
  nbProduits: number
  commande: {
    reference: string
    statut: string
    montantTotal: number
    lignes: Array<{ dci: string; quantite: number; quantiteLivre: number }>
  }
}

const STATUT_META: Record<string, { style: string; label: string }> = {
  PLANIFIEE: { style: 'bg-sky-100 text-sky-800 border-sky-300', label: 'Planifiée' },
  EN_ROUTE: { style: 'bg-amber-100 text-amber-800 border-amber-300', label: 'En route' },
  LIVREE: { style: 'bg-emerald-100 text-emerald-800 border-emerald-300', label: 'Livrée' },
  LITIGE: { style: 'bg-red-100 text-red-800 border-red-300', label: 'Litige' },
  ECHEC: { style: 'bg-gray-100 text-gray-700 border-gray-300', label: 'Échec' },
}

export default function LivraisonsPage() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([])
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateFiltre, setDateFiltre] = useState('')

  const [dialogOuvert, setDialogOuvert] = useState(false)
  const [livraisonActive, setLivraisonActive] = useState<Livraison | null>(null)
  const [statutCible, setStatutCible] = useState('')
  const [signature, setSignature] = useState('')
  const [motif, setMotif] = useState('')
  const [busy, setBusy] = useState(false)

  const fetchLivraisons = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFiltre) params.set('date', dateFiltre)
      const res = await fetch(`/api/grossistes/livraisons?${params}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de chargement')
        return
      }
      setLivraisons(json.livraisons ?? [])
      setStats(json.stats ?? null)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [dateFiltre])

  useEffect(() => {
    fetchLivraisons()
  }, [fetchLivraisons])

  function avancerStatut(l: Livraison, statut: string) {
    setLivraisonActive(l)
    setStatutCible(statut)
    setSignature('')
    setMotif('')
    setDialogOuvert(true)
  }

  async function confirmerTransition() {
    if (!livraisonActive || !statutCible) return
    if (statutCible === 'LIVREE' && !signature.trim()) {
      toast.error('Signature du responsable d’officine requise')
      return
    }
    if ((statutCible === 'LITIGE' || statutCible === 'ECHEC') && !motif.trim()) {
      toast.error('Motif obligatoire')
      return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/grossistes/livraisons/${livraisonActive.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          statut: statutCible,
          signatureElectronique: statutCible === 'LIVREE' ? signature.trim() : undefined,
          motif: statutCible !== 'LIVREE' ? motif.trim() : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de transition')
        return
      }
      toast.success(`Livraison → ${STATUT_META[statutCible]?.label ?? statutCible}`)
      setDialogOuvert(false)
      fetchLivraisons()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="w-6 h-6 text-teal-700" />
            Livraisons
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            G05 — Planning et suivi des livraisons. Signature électronique du responsable
            d&apos;officine à la réception, gestion des litiges et écarts.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Livraisons du jour</Label>
            <Input type="date" value={dateFiltre} onChange={(e) => setDateFiltre(e.target.value)} />
          </div>
          {dateFiltre && (
            <Button variant="outline" onClick={() => setDateFiltre('')}>Tout afficher</Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['planifiees', 'enRoute', 'livrees', 'litiges', 'echecs'] as const).map((k) => (
            <Card key={k}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{STATUT_META[k === 'planifiees' ? 'PLANIFIEE' : k === 'enRoute' ? 'EN_ROUTE' : k === 'livrees' ? 'LIVREE' : k === 'litiges' ? 'LITIGE' : 'ECHEC']?.label}</p>
                <p className={`text-2xl font-bold ${k === 'livrees' ? 'text-emerald-700' : k === 'litiges' || k === 'echecs' ? 'text-red-700' : ''}`}>
                  {stats[k] ?? 0}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Suivi des livraisons</CardTitle>
          <CardDescription>Workflow : PLANIFIEE → EN_ROUTE → LIVREE / LITIGE / ECHEC</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : livraisons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Aucune livraison</p>
              <p className="text-sm text-muted-foreground mt-1">
                Planifiez une livraison depuis un bon de picking PRET
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">Commande</th>
                    <th className="text-left p-3 font-medium">Officine</th>
                    <th className="text-left p-3 font-medium">Planifiée</th>
                    <th className="text-left p-3 font-medium">Produits</th>
                    <th className="text-left p-3 font-medium">Montant</th>
                    <th className="text-left p-3 font-medium">Statut</th>
                    <th className="text-right p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {livraisons.map((l) => (
                    <tr key={l.id} className="border-b hover:bg-muted/30">
                      <td className="p-3 font-medium">{l.commande.reference}</td>
                      <td className="p-3">
                        <p>{l.pharmacie?.nom ?? '—'}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {l.pharmacie?.ville ?? ''}
                        </p>
                      </td>
                      <td className="p-3 text-xs">
                        {l.planning ? new Date(l.planning).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                      <td className="p-3">{l.nbProduits}</td>
                      <td className="p-3 font-semibold">{l.commande.montantTotal.toLocaleString('fr-FR')} FCFA</td>
                      <td className="p-3">
                        <Badge className={STATUT_META[l.statut]?.style ?? ''}>
                          {STATUT_META[l.statut]?.label ?? l.statut}
                        </Badge>
                        {l.signatureElectronique && (
                          <p className="text-[10px] text-emerald-700 mt-1">✓ {l.signatureElectronique}</p>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/api/grossistes/livraisons/${l.id}/bordereau`, '_blank')}
                            title="Bordereau PDF"
                          >
                            <FileDown className="w-3.5 h-3.5 mr-1" /> PDF
                          </Button>
                          {l.statut === 'PLANIFIEE' && (
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => avancerStatut(l, 'EN_ROUTE')}>
                              <PlayCircle className="w-3.5 h-3.5 mr-1" /> Départ
                            </Button>
                          )}
                          {l.statut === 'EN_ROUTE' && (
                            <>
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => avancerStatut(l, 'LIVREE')}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Livrée
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => avancerStatut(l, 'LITIGE')} title="Litige">
                                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                              </Button>
                            </>
                          )}
                          {l.statut === 'LITIGE' && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => avancerStatut(l, 'LIVREE')}>
                              Résoudre
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog signature / motif */}
      <Dialog open={dialogOuvert} onOpenChange={setDialogOuvert}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {STATUT_META[statutCible]?.label ?? ''} — {livraisonActive?.commande.reference}
            </DialogTitle>
            <DialogDescription>
              {statutCible === 'LIVREE'
                ? 'La signature électronique du responsable d’officine est obligatoire pour clôturer la livraison.'
                : 'Décrivez le motif (litige, échec de livraison…) — cette information est tracée.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            {statutCible === 'LIVREE' ? (
              <div className="space-y-2">
                <Label>Signature électronique (nom du responsable) *</Label>
                <Input value={signature} onChange={(e) => setSignature(e.target.value)} placeholder="ex. Dr. A. Kponou — Pharmacien" />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Motif *</Label>
                <Input value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="ex. 3 boîtes refusées (dégâts transport)" />
              </div>
            )}
            {livraisonActive?.commande.lignes && (
              <div className="rounded-lg border p-3 max-h-40 overflow-y-auto text-xs">
                <p className="font-semibold mb-1">Contenu de la commande</p>
                {livraisonActive.commande.lignes.map((li, i) => (
                  <p key={i} className="text-muted-foreground">
                    {li.dci} — {li.quantiteLivre}/{li.quantite} livrées
                  </p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOuvert(false)}>Annuler</Button>
            <Button onClick={confirmerTransition} disabled={busy} className="bg-teal-700 hover:bg-teal-800">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
