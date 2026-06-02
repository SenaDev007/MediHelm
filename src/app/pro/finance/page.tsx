'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Banknote, TrendingUp, TrendingDown, Wallet, Plus, FileText, BarChart3 } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { toast } from 'sonner'

interface VenteData {
  id: string
  montantTotal: number
  montantPaye: number
  typeVente: string
  statut: string
  createdAt: string
  paiements: { modePaiement: string; montant: number }[]
}

interface TresorerieData {
  soldeCaisse: number
  soldeBanque: number
  soldeMobileMoney: number
  total: number
}

interface JournalData {
  id: string
  code: string
  libelle: string
  ecritures: {
    id: string
    date: string
    numeroPiece: string
    compte: string
    libelle: string
    debit: number
    credit: number
    lettrage: string | null
  }[]
}

interface EcritureData {
  id: string
  date: string
  numeroPiece: string
  compte: string
  libelle: string
  debit: number
  credit: number
  journal: { id: string; code: string; libelle: string }
}

interface FactureData {
  id: string
  montant: number
  statut: string
  createdAt: string
  abonnement: { pharmacie: { nom: string } } | null
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

export default function FinancePage() {
  const { pharmacie } = useAuth()
  const [ventes, setVentes] = useState<VenteData[]>([])
  const [tresorerie, setTresorerie] = useState<TresorerieData | null>(null)
  const [journaux, setJournaux] = useState<JournalData[]>([])
  const [ecritures, setEcritures] = useState<EcritureData[]>([])
  const [factures, setFactures] = useState<FactureData[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')

  // Journal dialog
  const [journalDialogOpen, setJournalDialogOpen] = useState(false)
  const [journalCode, setJournalCode] = useState('')
  const [journalLibelle, setJournalLibelle] = useState('')

  // Ecriture dialog
  const [ecritureDialogOpen, setEcritureDialogOpen] = useState(false)
  const [ecrJournalId, setEcrJournalId] = useState('')
  const [ecrCompte, setEcrCompte] = useState('')
  const [ecrLibelle, setEcrLibelle] = useState('')
  const [ecrDebit, setEcrDebit] = useState('')
  const [ecrCredit, setEcrCredit] = useState('')

  const loadData = useCallback(async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const [ventesRes, tresRes, journauxRes, ecrituresRes, facturesRes] = await Promise.all([
        fetch(`/api/ventes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/tresorerie?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/journaux?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/ecritures?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/factures`).then(r => r.ok ? r.json() : []),
      ])
      setVentes(ventesRes)
      setTresorerie(tresRes)
      setJournaux(journauxRes)
      setEcritures(ecrituresRes)
      setFactures(facturesRes)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [pharmacie?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const totalCA = ventes.filter(v => v.statut === 'VALIDEE').reduce((s, v) => s + v.montantTotal, 0)
  const totalPaye = ventes.filter(v => v.statut === 'VALIDEE').reduce((s, v) => s + v.montantPaye, 0)
  const totalImpaye = totalCA - totalPaye

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

  // Trésorerie chart
  const tresorerieChartData = tresorerie ? [
    { name: 'Caisse', montant: tresorerie.soldeCaisse },
    { name: 'Banque', montant: tresorerie.soldeBanque },
    { name: 'Mobile Money', montant: tresorerie.soldeMobileMoney },
  ] : []

  // Create journal
  const handleCreateJournal = async () => {
    if (!pharmacie?.id || !journalCode || !journalLibelle) return
    try {
      const res = await fetch('/api/journaux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacieId: pharmacie.id, code: journalCode, libelle: journalLibelle }),
      })
      if (res.ok) {
        toast.success('Journal créé')
        setJournalDialogOpen(false)
        setJournalCode(''); setJournalLibelle('')
        loadData()
      }
    } catch {
      toast.error('Erreur')
    }
  }

  // Create ecriture
  const handleCreateEcriture = async () => {
    if (!pharmacie?.id || !ecrJournalId || !ecrCompte || !ecrLibelle) return
    try {
      const res = await fetch('/api/ecritures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          journalId: ecrJournalId,
          compte: ecrCompte,
          libelle: ecrLibelle,
          debit: parseFloat(ecrDebit) || 0,
          credit: parseFloat(ecrCredit) || 0,
        }),
      })
      if (res.ok) {
        toast.success('Écriture enregistrée')
        setEcritureDialogOpen(false)
        setEcrCompte(''); setEcrLibelle(''); setEcrDebit(''); setEcrCredit('')
        loadData()
      }
    } catch {
      toast.error('Erreur')
    }
  }

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard">Tableau de bord</TabsTrigger>
          <TabsTrigger value="journal">Journal comptable</TabsTrigger>
          <TabsTrigger value="tresorerie">Trésorerie</TabsTrigger>
          <TabsTrigger value="factures">Factures</TabsTrigger>
        </TabsList>

        {/* === DASHBOARD TAB === */}
        <TabsContent value="dashboard" className="space-y-6 mt-4">
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
        </TabsContent>

        {/* === JOURNAL COMPTABLE TAB === */}
        <TabsContent value="journal" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Journaux comptables</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-1" onClick={() => setEcritureDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Nouvelle écriture
              </Button>
              <Button className="gap-1" onClick={() => setJournalDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Nouveau journal
              </Button>
            </div>
          </div>

          {/* Journaux list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {journaux.length === 0 ? (
              <Card className="col-span-full"><CardContent className="py-8 text-center text-muted-foreground">Aucun journal</CardContent></Card>
            ) : (
              journaux.map(j => (
                <Card key={j.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs">{j.code}</Badge>
                      <span className="text-sm font-medium">{j.libelle}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{j.ecritures?.length || 0} écritures</p>
                    <div className="mt-2 text-xs">
                      <div className="flex justify-between">
                        <span>Total débit</span>
                        <span className="font-semibold">{formatFCFA(j.ecritures?.reduce((s: number, e: { debit: number }) => s + e.debit, 0) || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total crédit</span>
                        <span className="font-semibold">{formatFCFA(j.ecritures?.reduce((s: number, e: { credit: number }) => s + e.credit, 0) || 0)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Écritures */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Dernières écritures comptables</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Journal</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">N° Pièce</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Compte</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Libellé</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Débit</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Crédit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ecritures.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-muted-foreground text-sm">Aucune écriture</td></tr>
                    ) : (
                      ecritures.slice(0, 30).map(e => (
                        <tr key={e.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 text-sm">{new Date(e.date).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3 text-sm"><Badge variant="outline" className="text-[9px]">{e.journal?.code}</Badge></td>
                          <td className="p-3 text-sm">{e.numeroPiece}</td>
                          <td className="p-3 text-sm font-mono">{e.compte}</td>
                          <td className="p-3 text-sm">{e.libelle}</td>
                          <td className="p-3 text-sm text-right font-semibold">{e.debit > 0 ? formatFCFA(e.debit) : ''}</td>
                          <td className="p-3 text-sm text-right font-semibold text-primary">{e.credit > 0 ? formatFCFA(e.credit) : ''}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TRESORERIE TAB === */}
        <TabsContent value="tresorerie" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Solde caisse</span>
                  <span className="text-xl font-bold block">{formatFCFA(tresorerie?.soldeCaisse ?? 0)}</span>
                </div>
                <Banknote className="w-8 h-8 text-primary/30" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Solde banque</span>
                  <span className="text-xl font-bold block">{formatFCFA(tresorerie?.soldeBanque ?? 0)}</span>
                </div>
                <Wallet className="w-8 h-8 text-primary/30" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Mobile Money</span>
                  <span className="text-xl font-bold block">{formatFCFA(tresorerie?.soldeMobileMoney ?? 0)}</span>
                </div>
                <TrendingUp className="w-8 h-8 text-primary/30" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Répartition de la trésorerie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tresorerieChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#888780" />
                    <YAxis tick={{ fontSize: 10 }} stroke="#888780" />
                    <Tooltip formatter={(value: number) => [formatFCFA(value), 'Montant']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="montant" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total trésorerie</span>
                <span className="text-2xl font-bold text-primary">{formatFCFA(tresorerie?.total ?? 0)}</span>
              </div>
              {tresorerie?.dernierUpdate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Dernière mise à jour: {new Date(tresorerie.dernierUpdate).toLocaleDateString('fr-FR')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === FACTURES TAB === */}
        <TabsContent value="factures" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Factures
            </h2>
          </div>

          {/* Résumé factures */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">Payées</span>
                  <span className="text-xl font-bold block text-primary">
                    {formatFCFA(factures.filter(f => f.statut === 'PAYEE').reduce((s, f) => s + f.montant, 0))}
                  </span>
                </div>
                <FileText className="w-8 h-8 text-primary/30" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">En attente</span>
                  <span className="text-xl font-bold block text-amber-500">
                    {formatFCFA(factures.filter(f => f.statut === 'EN_ATTENTE').reduce((s, f) => s + f.montant, 0))}
                  </span>
                </div>
                <FileText className="w-8 h-8 text-amber-400/30" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase">En retard</span>
                  <span className="text-xl font-bold block text-destructive">
                    {formatFCFA(factures.filter(f => f.statut === 'EN_RETARD').reduce((s, f) => s + f.montant, 0))}
                  </span>
                </div>
                <FileText className="w-8 h-8 text-destructive/30" />
              </CardContent>
            </Card>
          </div>

          {/* Table des factures */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Pharmacie</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Montant</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {factures.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-8 text-muted-foreground text-sm">Aucune facture</td></tr>
                    ) : (
                      factures.slice(0, 30).map(f => (
                        <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 text-sm">{new Date(f.createdAt).toLocaleDateString('fr-FR')}</td>
                          <td className="p-3 text-sm">{f.abonnement?.pharmacie?.nom || '—'}</td>
                          <td className="p-3 text-sm text-right font-semibold">{formatFCFA(f.montant)}</td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={f.statut === 'PAYEE' ? 'default' : f.statut === 'EN_RETARD' ? 'destructive' : 'outline'}
                              className="text-[10px]"
                            >
                              {f.statut === 'PAYEE' ? 'Payée' : f.statut === 'EN_RETARD' ? 'En retard' : f.statut === 'ANNULEE' ? 'Annulée' : 'En attente'}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Journal Dialog */}
      <Dialog open={journalDialogOpen} onOpenChange={setJournalDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouveau journal</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Code</Label><Input placeholder="VT" value={journalCode} onChange={e => setJournalCode(e.target.value)} /></div>
            <div><Label>Libellé</Label><Input placeholder="Journal des ventes" value={journalLibelle} onChange={e => setJournalLibelle(e.target.value)} /></div>
            <Button className="w-full" onClick={handleCreateJournal}>Créer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ecriture Dialog */}
      <Dialog open={ecritureDialogOpen} onOpenChange={setEcritureDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nouvelle écriture</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Journal</Label>
              <Select value={ecrJournalId} onValueChange={setEcrJournalId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {journaux.map(j => (
                    <SelectItem key={j.id} value={j.id}>{j.code} — {j.libelle}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Compte</Label><Input placeholder="707000" value={ecrCompte} onChange={e => setEcrCompte(e.target.value)} /></div>
            <div><Label>Libellé</Label><Input placeholder="Vente du jour" value={ecrLibelle} onChange={e => setEcrLibelle(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Débit</Label><Input type="number" placeholder="0" value={ecrDebit} onChange={e => setEcrDebit(e.target.value)} /></div>
              <div><Label>Crédit</Label><Input type="number" placeholder="0" value={ecrCredit} onChange={e => setEcrCredit(e.target.value)} /></div>
            </div>
            <Button className="w-full" onClick={handleCreateEcriture}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
