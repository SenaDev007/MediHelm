'use client'

// ============================================================
// MediHelm Grossiste — Module G06 · Clients & Officines
// Fiches clients, crédit (encours vs plafond), conditions de paiement
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import {
  Users,
  Loader2,
  AlertTriangle,
  Building2,
  Percent,
  Wallet,
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

interface Client {
  id: string | null
  pharmacie: { id: string; nom: string; ville: string | null; adresse: string | null; telephone: string }
  conditionsPaiement: string
  creditPlafond: number
  remiseDefaut: number
  actif: boolean
  implicite: boolean
  ca: number
  encours: number
  nbCommandes: number
  derniere: string | null
  enRetard: number
  depassementPlafond: boolean
}

const CONDITIONS: Record<string, string> = {
  COMPTANT: 'Comptant',
  '30_JOURS': '30 jours',
  '60_JOURS': '60 jours',
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [stats, setStats] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [form, setForm] = useState({ pharmacieId: '', conditionsPaiement: 'COMPTANT', creditPlafond: '', remiseDefaut: '', notes: '' })
  const [submitting, setSubmitting] = useState(false)

  const fetchClients = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/grossistes/clients')
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de chargement')
        return
      }
      setClients(json.clients ?? [])
      setStats(json.stats ?? null)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  function ouvrirEdition(c: Client) {
    setEditClient(c)
    setForm({
      pharmacieId: c.pharmacie.id,
      conditionsPaiement: c.conditionsPaiement,
      creditPlafond: String(c.creditPlafond || ''),
      remiseDefaut: String(c.remiseDefaut || ''),
      notes: '',
    })
    setDialogOpen(true)
  }

  async function enregistrer() {
    if (!form.pharmacieId) {
      toast.error('Pharmacie requise')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/grossistes/clients', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: form.pharmacieId,
          conditionsPaiement: form.conditionsPaiement,
          creditPlafond: Number(form.creditPlafond) || 0,
          remiseDefaut: Number(form.remiseDefaut) || 0,
          notes: form.notes || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur d’enregistrement')
        return
      }
      toast.success('Fiche client enregistrée')
      setDialogOpen(false)
      fetchClients()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-teal-700" />
          Clients & Officines
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          G06 — Fiches clients officines, conditions de paiement, encours de crédit vs plafond autorisé,
          rapport mensuel par officine.
        </p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Clients</p>
            <p className="text-2xl font-bold">{stats.nbClients}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">CA cumulé</p>
            <p className="text-2xl font-bold text-emerald-700">{(stats.totalCA ?? 0).toLocaleString('fr-FR')} F</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Créances</p>
            <p className="text-2xl font-bold text-amber-700">{(stats.totalEncours ?? 0).toLocaleString('fr-FR')} F</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recouvrement</p>
            <p className="text-2xl font-bold text-teal-700">{stats.tauxRecouvrement ?? 100} %</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Dépassements / retards</p>
            <p className="text-2xl font-bold text-red-700">{stats.depassementsPlafond} / {stats.clientsEnRetard}</p>
          </CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fiches clients</CardTitle>
          <CardDescription>
            Les officines ayant déjà commandé apparaissent automatiquement (fiche implicite) —
            complétez leurs conditions commerciales
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Aucun client pour l&apos;instant</p>
              <p className="text-sm text-muted-foreground mt-1">Les officines apparaîtront dès leur première commande</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Officine</TableHead>
                    <TableHead>Conditions</TableHead>
                    <TableHead>Commandes</TableHead>
                    <TableHead>CA</TableHead>
                    <TableHead>Encours / plafond</TableHead>
                    <TableHead>Retards</TableHead>
                    <TableHead className="text-right">Fiche</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((c) => (
                    <TableRow key={c.pharmacie.id}>
                      <TableCell>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-teal-700" />
                          {c.pharmacie.nom}
                        </p>
                        <p className="text-xs text-muted-foreground">{c.pharmacie.ville ?? ''}</p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {CONDITIONS[c.conditionsPaiement] ?? c.conditionsPaiement}
                        </Badge>
                        {c.remiseDefaut > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-0.5">
                            <Percent className="w-2.5 h-2.5" /> {c.remiseDefaut} %
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{c.nbCommandes}</TableCell>
                      <TableCell className="text-sm font-semibold">{c.ca.toLocaleString('fr-FR')} F</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${c.encours > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                            {c.encours.toLocaleString('fr-FR')} F
                          </span>
                          {c.creditPlafond > 0 && (
                            <span className="text-xs text-muted-foreground">/ {c.creditPlafond.toLocaleString('fr-FR')}</span>
                          )}
                        </div>
                        {c.depassementPlafond && (
                          <Badge className="mt-1 bg-red-100 text-red-800 border-red-300">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Plafond dépassé
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {c.enRetard > 0 ? (
                          <Badge className="bg-red-100 text-red-800 border-red-300">{c.enRetard} impayé(s) &gt; 30 j</Badge>
                        ) : (
                          <span className="text-xs text-emerald-600">à jour</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => ouvrirEdition(c)}>
                          <Wallet className="w-3.5 h-3.5 mr-1" />
                          {c.implicite ? 'Créer la fiche' : 'Modifier'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Dialog fiche client */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editClient ? `Fiche client — ${editClient.pharmacie.nom}` : 'Nouvelle fiche client'}</DialogTitle>
            <DialogDescription>Conditions de paiement et encours de crédit autorisé</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>Conditions de paiement</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={form.conditionsPaiement}
                onChange={(e) => setForm((f) => ({ ...f, conditionsPaiement: e.target.value }))}
              >
                <option value="COMPTANT">Comptant</option>
                <option value="30_JOURS">30 jours</option>
                <option value="60_JOURS">60 jours</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plafond de crédit (FCFA)</Label>
                <Input type="number" min={0} value={form.creditPlafond} onChange={(e) => setForm((f) => ({ ...f, creditPlafond: e.target.value }))} placeholder="500000" />
              </div>
              <div className="space-y-2">
                <Label>Remise par défaut (%)</Label>
                <Input type="number" min={0} max={100} value={form.remiseDefaut} onChange={(e) => setForm((f) => ({ ...f, remiseDefaut: e.target.value }))} placeholder="5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Conditions particulières…" />
            </div>
            {editClient && editClient.encours > 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Encours actuel : <b>{editClient.encours.toLocaleString('fr-FR')} FCFA</b> sur {editClient.nbCommandes} commande(s) non soldée(s).
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={enregistrer} disabled={submitting} className="bg-teal-700 hover:bg-teal-800">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
