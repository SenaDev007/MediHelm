'use client'

import { useAuth } from '@/app/pro/auth-context'
import { KpiCard } from '@/components/pro/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  CreditCard,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface MedicamentRemboursable {
  id: string
  dci: string
  nomCommercial: string
  remboursable: boolean
  organisme: string
  tauxRemboursement: number
  prixPublic: number
}

interface Remboursement {
  id: string
  pharmacieId: string
  patientNom: string
  organisme: string
  montant: number
  montantRembourse: number
  statut: string
  dateDemande: string
  dateTraitement: string | null
  createdAt: string
}

interface TierPayant {
  id: string
  organismeNom: string
  organismeType: string
  tauxRemboursement: number
  actif: boolean
  nbPatients: number
}

// === Helpers ===

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getStatutRemboursementBadge(statut: string) {
  switch (statut) {
    case 'EN_ATTENTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">En attente</Badge>
    case 'APPROUVE':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">Approuvé</Badge>
    case 'REMBOURSE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Remboursé</Badge>
    case 'REFUSE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Refusé</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

const ORGANISMES = ['CNSS', 'RAMU', 'ASCOMA', 'SONAPRA', 'AUTRE']

// === Main Component ===

export default function RemboursablesPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('medicaments')

  const [medicaments, setMedicaments] = useState<MedicamentRemboursable[]>([])
  const [medsLoading, setMedsLoading] = useState(true)
  const [medSearch, setMedSearch] = useState('')
  const [medOrganismeFilter, setMedOrganismeFilter] = useState('all')

  const [remboursements, setRemboursements] = useState<Remboursement[]>([])
  const [rembLoading, setRembLoading] = useState(true)
  const [rembSearch, setRembSearch] = useState('')
  const [rembStatutFilter, setRembStatutFilter] = useState('all')
  const [rembPage, setRembPage] = useState(1)
  const [rembTotalPages, setRembTotalPages] = useState(1)

  const [tiersPayants, setTiersPayants] = useState<TierPayant[]>([])
  const [tpLoading, setTpLoading] = useState(true)

  // Dialog
  const [rembDialogOpen, setRembDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [rembForm, setRembForm] = useState({
    patientNom: '',
    organisme: 'CNSS',
    montant: '',
    montantRembourse: '',
  })

  const fetchMedicaments = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, remboursable: 'true' })
      if (medSearch) params.set('search', medSearch)
      const res = await fetch(`/api/medicaments?${params}`)
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json) ? json : json.data || []
        setMedicaments(data.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          dci: m.dci as string,
          nomCommercial: m.nomCommercial as string,
          remboursable: m.remboursable as boolean,
          organisme: 'CNSS',
          tauxRemboursement: 80,
          prixPublic: m.prixPublic as number,
        })))
      }
    } catch {
      // silent
    } finally {
      setMedsLoading(false)
    }
  }, [pharmacieId, medSearch])

  const fetchRemboursements = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: rembPage.toString(), pageSize: '10' })
      if (rembStatutFilter !== 'all') params.set('statut', rembStatutFilter)
      const res = await fetch(`/api/remboursements?${params}`)
      if (res.ok) {
        const json = await res.json()
        setRemboursements(Array.isArray(json) ? json : json.data || [])
        setRembTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setRembLoading(false)
    }
  }, [pharmacieId, rembPage, rembStatutFilter])

  const fetchTiersPayants = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/tiers-payants?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        setTiersPayants(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    } finally {
      setTpLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchMedicaments() }, [fetchMedicaments])
  useEffect(() => { fetchRemboursements() }, [fetchRemboursements])
  useEffect(() => { fetchTiersPayants() }, [fetchTiersPayants])
  useEffect(() => { setRembPage(1) }, [rembSearch, rembStatutFilter])

  const stats = useMemo(() => ({
    totalMeds: medicaments.length,
    totalRemb: remboursements.length,
    enAttente: remboursements.filter(r => r.statut === 'EN_ATTENTE').length,
    montantEnAttente: remboursements.filter(r => r.statut === 'EN_ATTENTE').reduce((s, r) => s + r.montantRembourse, 0),
  }), [medicaments, remboursements])

  async function handleSubmitRemboursement() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/remboursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          patientNom: rembForm.patientNom,
          organisme: rembForm.organisme,
          montant: parseFloat(rembForm.montant) || 0,
          montantRembourse: parseFloat(rembForm.montantRembourse) || 0,
          statut: 'EN_ATTENTE',
          dateDemande: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        toast.success('Demande de remboursement créée')
        setRembDialogOpen(false)
        setRembForm({ patientNom: '', organisme: 'CNSS', montant: '', montantRembourse: '' })
        fetchRemboursements()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Remboursables</h1>
          <p className="text-muted-foreground text-sm">Médicaments remboursables, tiers payant et remboursements</p>
        </div>
        <Button onClick={() => setRembDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nouvelle demande
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Médicaments remboursables" value={stats.totalMeds} icon={ShieldCheck} variant="default" />
        <KpiCard title="Total remboursements" value={stats.totalRemb} icon={FileText} variant="default" />
        <KpiCard title="En attente" value={stats.enAttente} icon={Clock} variant="warning" />
        <KpiCard title="Montant en attente" value={formatFCFA(stats.montantEnAttente)} icon={CreditCard} variant="danger" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="medicaments" className="gap-2"><ShieldCheck className="w-4 h-4" /> Médicaments</TabsTrigger>
          <TabsTrigger value="remboursements" className="gap-2"><FileText className="w-4 h-4" /> Remboursements</TabsTrigger>
          <TabsTrigger value="tiers-payant" className="gap-2"><Building2 className="w-4 h-4" /> Tiers payant</TabsTrigger>
        </TabsList>

        {/* Médicaments Tab */}
        <TabsContent value="medicaments" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un médicament..." value={medSearch} onChange={e => setMedSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={medOrganismeFilter} onValueChange={setMedOrganismeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Organisme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    {ORGANISMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {medsLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : medicaments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldCheck className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun médicament remboursable</p>
                  <p className="text-sm text-muted-foreground mt-1">Les médicaments remboursables apparaîtront ici</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>DCI</TableHead>
                        <TableHead>Nom commercial</TableHead>
                        <TableHead>Prix public</TableHead>
                        <TableHead>Organisme</TableHead>
                        <TableHead>Taux</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {medicaments.map(m => (
                        <TableRow key={m.id}>
                          <TableCell className="font-medium">{m.dci}</TableCell>
                          <TableCell>{m.nomCommercial}</TableCell>
                          <TableCell>{formatFCFA(m.prixPublic)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{m.organisme}</Badge></TableCell>
                          <TableCell>{m.tauxRemboursement}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remboursements Tab */}
        <TabsContent value="remboursements" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={rembSearch} onChange={e => setRembSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={rembStatutFilter} onValueChange={setRembStatutFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                    <SelectItem value="APPROUVE">Approuvé</SelectItem>
                    <SelectItem value="REMBOURSE">Remboursé</SelectItem>
                    <SelectItem value="REFUSE">Refusé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {rembLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : remboursements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun remboursement</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Organisme</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Remboursement</TableHead>
                          <TableHead>Date demande</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {remboursements.map(r => (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{r.patientNom}</TableCell>
                            <TableCell>{r.organisme}</TableCell>
                            <TableCell>{formatFCFA(r.montant)}</TableCell>
                            <TableCell className="text-emerald-600 font-medium">{formatFCFA(r.montantRembourse)}</TableCell>
                            <TableCell>{formatDate(r.dateDemande)}</TableCell>
                            <TableCell>{getStatutRemboursementBadge(r.statut)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">Page {rembPage} sur {rembTotalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={rembPage <= 1} onClick={() => setRembPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" disabled={rembPage >= rembTotalPages} onClick={() => setRembPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tiers Payant Tab */}
        <TabsContent value="tiers-payant" className="space-y-4">
          {tpLoading ? (
            <Card><CardContent className="p-6"><TableSkeleton /></CardContent></Card>
          ) : tiersPayants.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Aucun tiers payant configuré</p>
                <p className="text-sm text-muted-foreground mt-1">Configurez les organismes de tiers payant</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiersPayants.map(tp => (
                <Card key={tp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium">{tp.organismeNom}</h3>
                        <p className="text-sm text-muted-foreground">{tp.organismeType}</p>
                      </div>
                      {tp.actif
                        ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Actif</Badge>
                        : <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Inactif</Badge>
                      }
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Taux</span>
                        <p className="font-medium">{tp.tauxRemboursement}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Patients</span>
                        <p className="font-medium">{tp.nbPatients}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Demande Remboursement Dialog */}
      <Dialog open={rembDialogOpen} onOpenChange={setRembDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle demande de remboursement</DialogTitle>
            <DialogDescription>Créez une demande de remboursement pour un patient</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rb-patient">Nom du patient *</Label>
              <Input id="rb-patient" value={rembForm.patientNom} onChange={e => setRembForm(f => ({ ...f, patientNom: e.target.value }))} placeholder="Nom complet du patient" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rb-organisme">Organisme *</Label>
              <Select value={rembForm.organisme} onValueChange={v => setRembForm(f => ({ ...f, organisme: v }))}>
                <SelectTrigger id="rb-organisme"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ORGANISMES.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rb-montant">Montant total (FCFA)</Label>
                <Input id="rb-montant" type="number" value={rembForm.montant} onChange={e => setRembForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rb-rembourse">Montant remboursé (FCFA)</Label>
                <Input id="rb-rembourse" type="number" value={rembForm.montantRembourse} onChange={e => setRembForm(f => ({ ...f, montantRembourse: e.target.value }))} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRembDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitRemboursement} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
