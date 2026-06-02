'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
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
import { Shield, Plus, Building2, Users, Receipt, Search } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

// --- Organismes Types ---
interface Organisme {
  id: string
  nom: string
  code: string
  type: string
  tauxRemboursement: number
  actif: boolean
  _count?: { tiersPayants: number }
}

// --- Tiers Payants Types ---
interface TiersPayant {
  id: string
  patientId: string
  organismeId: string
  numeroAdhesion: string
  tauxPriseEnCharge: number
  plafondAnnuel: number | null
  actif: boolean
  patient: { id: string; nom: string; prenom: string }
  organisme: { id: string; nom: string; code: string; tauxRemboursement: number }
  _count?: { remboursements: number }
}

// --- Remboursements Types ---
interface Remboursement {
  id: string
  venteId: string
  tiersPayantId: string
  montantTotal: number
  montantPrisEnCharge: number
  montantPatient: number
  statut: string
  dateSoumission: string
  dateRemboursement: string | null
  vente: { id: string; montantTotal: number; createdAt: string }
  tiersPayant: {
    id: string
    patient: { nom: string; prenom: string }
    organisme: { nom: string; code: string }
  }
}

// --- Patient type for dropdown ---
interface Patient {
  id: string
  nom: string
  prenom: string
  telephone: string | null
}

export default function RemboursablesPage() {
  const { pharmacie } = useAuth()
  const [activeTab, setActiveTab] = useState('organismes')

  // Data
  const [organismes, setOrganismes] = useState<Organisme[]>([])
  const [tiersPayants, setTiersPayants] = useState<TiersPayant[]>([])
  const [remboursements, setRemboursements] = useState<Remboursement[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialogs
  const [addOrgDialogOpen, setAddOrgDialogOpen] = useState(false)
  const [addTpDialogOpen, setAddTpDialogOpen] = useState(false)
  const [addRembDialogOpen, setAddRembDialogOpen] = useState(false)

  // Organisme form
  const [orgNom, setOrgNom] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [orgType, setOrgType] = useState('CNSS')
  const [orgTaux, setOrgTaux] = useState('80')

  // Tiers Payant form
  const [tpPatientId, setTpPatientId] = useState('')
  const [tpOrganismeId, setTpOrganismeId] = useState('')
  const [tpNumero, setTpNumero] = useState('')
  const [tpTaux, setTpTaux] = useState('80')
  const [tpPlafond, setTpPlafond] = useState('')

  // Remboursement form
  const [rembTiersPayantId, setRembTiersPayantId] = useState('')
  const [rembMontantTotal, setRembMontantTotal] = useState('')

  const fetchAllData = async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const [orgRes, tpRes, rembRes, patRes] = await Promise.all([
        fetch(`/api/organismes?pharmacieId=${pharmacie.id}`),
        fetch(`/api/tiers-payants?pharmacieId=${pharmacie.id}`),
        fetch(`/api/remboursements?pharmacieId=${pharmacie.id}`),
        fetch(`/api/patients?pharmacieId=${pharmacie.id}`),
      ])
      if (orgRes.ok) setOrganismes(await orgRes.json())
      if (tpRes.ok) setTiersPayants(await tpRes.json())
      if (rembRes.ok) setRemboursements(await rembRes.json())
      if (patRes.ok) setPatients(await patRes.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [pharmacie?.id])

  // --- Organismes filtered ---
  const filteredOrganismes = useMemo(() => {
    if (!search) return organismes
    const q = search.toLowerCase()
    return organismes.filter(o =>
      o.nom.toLowerCase().includes(q) || o.code.toLowerCase().includes(q)
    )
  }, [organismes, search])

  // --- Tiers Payants filtered ---
  const filteredTiersPayants = useMemo(() => {
    if (!search) return tiersPayants
    const q = search.toLowerCase()
    return tiersPayants.filter(tp =>
      `${tp.patient.nom} ${tp.patient.prenom}`.toLowerCase().includes(q) ||
      tp.organisme.nom.toLowerCase().includes(q) ||
      tp.numeroAdhesion.toLowerCase().includes(q)
    )
  }, [tiersPayants, search])

  // --- Remboursements filtered ---
  const filteredRemboursements = useMemo(() => {
    if (!search) return remboursements
    const q = search.toLowerCase()
    return remboursements.filter(r =>
      `${r.tiersPayant.patient.nom} ${r.tiersPayant.patient.prenom}`.toLowerCase().includes(q) ||
      r.tiersPayant.organisme.nom.toLowerCase().includes(q) ||
      r.statut.toLowerCase().includes(q)
    )
  }, [remboursements, search])

  // --- Stats ---
  const totalPrisEnCharge = remboursements
    .filter(r => r.statut === 'REMBOURSE')
    .reduce((s, r) => s + r.montantPrisEnCharge, 0)

  const handleAddOrganisme = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/organismes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nom: orgNom,
          code: orgCode,
          type: orgType,
          tauxRemboursement: parseFloat(orgTaux) || 80,
          actif: true,
        }),
      })
      if (res.ok) {
        toast.success('Organisme ajouté avec succès')
        setAddOrgDialogOpen(false)
        resetOrgForm()
        fetchAllData()
      } else {
        toast.error("Erreur lors de l'ajout de l'organisme")
      }
    } catch {
      toast.error("Erreur lors de l'ajout de l'organisme")
    }
  }

  const handleAddTiersPayant = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/tiers-payants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          patientId: tpPatientId,
          organismeId: tpOrganismeId,
          numeroAdhesion: tpNumero,
          tauxPriseEnCharge: parseFloat(tpTaux) || 80,
          plafondAnnuel: tpPlafond ? parseFloat(tpPlafond) : null,
          actif: true,
        }),
      })
      if (res.ok) {
        toast.success('Tiers payant ajouté avec succès')
        setAddTpDialogOpen(false)
        resetTpForm()
        fetchAllData()
      } else {
        toast.error("Erreur lors de l'ajout du tiers payant")
      }
    } catch {
      toast.error("Erreur lors de l'ajout du tiers payant")
    }
  }

  const handleSubmitRemboursement = async () => {
    if (!pharmacie?.id) return
    try {
      const selectedTp = tiersPayants.find(tp => tp.id === rembTiersPayantId)
      const res = await fetch('/api/remboursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          venteId: 'demo-vente',
          tiersPayantId: rembTiersPayantId,
          montantTotal: parseFloat(rembMontantTotal) || 0,
          tauxPriseEnCharge: selectedTp?.tauxPriseEnCharge || 80,
        }),
      })
      if (res.ok) {
        toast.success('Remboursement soumis avec succès')
        setAddRembDialogOpen(false)
        setRembTiersPayantId('')
        setRembMontantTotal('')
        fetchAllData()
      } else {
        toast.error('Erreur lors de la soumission du remboursement')
      }
    } catch {
      toast.error('Erreur lors de la soumission du remboursement')
    }
  }

  const resetOrgForm = () => { setOrgNom(''); setOrgCode(''); setOrgType('CNSS'); setOrgTaux('80') }
  const resetTpForm = () => { setTpPatientId(''); setTpOrganismeId(''); setTpNumero(''); setTpTaux('80'); setTpPlafond('') }

  const getStatutBadge = (statut: string) => {
    const map: Record<string, { label: string; className: string }> = {
      SOUMIS: { label: 'Soumis', className: 'bg-blue-100 text-blue-800 border-0' },
      EN_TRAITEMENT: { label: 'En traitement', className: 'bg-amber-100 text-amber-800 border-0' },
      REMBOURSE: { label: 'Remboursé', className: 'bg-[#E1F5EE] text-[#085041] border-0' },
      REFUSE: { label: 'Refusé', className: 'bg-red-100 text-red-800 border-0' },
    }
    const info = map[statut] || { label: statut, className: 'bg-gray-100 text-gray-800 border-0' }
    return <Badge className={`text-[9px] ${info.className}`}>{info.label}</Badge>
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#1D9E75]" />
            Remboursables & Tiers Payant
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion des organismes et remboursements
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Organismes</span>
                <span className="text-xl font-bold block">{organismes.length}</span>
              </div>
              <Building2 className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Tiers Payants</span>
                <span className="text-xl font-bold block text-[#1D9E75]">{tiersPayants.length}</span>
              </div>
              <Users className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Total remboursé</span>
                <span className="text-xl font-bold block">{formatFCFA(totalPrisEnCharge)}</span>
              </div>
              <Receipt className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="organismes">Organismes</TabsTrigger>
            <TabsTrigger value="tiers-payants">Tiers Payants</TabsTrigger>
            <TabsTrigger value="remboursements">Remboursements</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {activeTab === 'organismes' && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddOrgDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Organisme
              </Button>
            )}
            {activeTab === 'tiers-payants' && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddTpDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Tiers Payant
              </Button>
            )}
            {activeTab === 'remboursements' && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddRembDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Soumettre
              </Button>
            )}
          </div>
        </div>

        {/* Organismes Tab */}
        <TabsContent value="organismes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organisme</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="text-center">Type</TableHead>
                      <TableHead className="text-center">Taux remboursement</TableHead>
                      <TableHead className="text-center">Adhérents</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrganismes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucun organisme trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrganismes.map(o => (
                        <TableRow key={o.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{o.nom}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{o.code}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="text-[9px]">{o.type}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-[#1D9E75]">{o.tauxRemboursement}%</span>
                          </TableCell>
                          <TableCell className="text-center text-sm">{o._count?.tiersPayants || 0}</TableCell>
                          <TableCell className="text-center">
                            {o.actif ? (
                              <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Actif</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px]">Inactif</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tiers Payants Tab */}
        <TabsContent value="tiers-payants" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Organisme</TableHead>
                      <TableHead>N° Adhésion</TableHead>
                      <TableHead className="text-center">Taux prise en charge</TableHead>
                      <TableHead className="text-right">Plafond annuel</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTiersPayants.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucun tiers payant trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTiersPayants.map(tp => (
                        <TableRow key={tp.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">
                            {tp.patient.nom} {tp.patient.prenom}
                          </TableCell>
                          <TableCell className="text-sm">{tp.organisme.nom}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{tp.numeroAdhesion}</TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold text-[#1D9E75]">{tp.tauxPriseEnCharge}%</span>
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {tp.plafondAnnuel ? formatFCFA(tp.plafondAnnuel) : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {tp.actif ? (
                              <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Actif</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px]">Inactif</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remboursements Tab */}
        <TabsContent value="remboursements" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient / Organisme</TableHead>
                      <TableHead className="text-right">Montant total</TableHead>
                      <TableHead className="text-right">Pris en charge</TableHead>
                      <TableHead className="text-right">Patient</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead>Date soumission</TableHead>
                      <TableHead>Date remboursement</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRemboursements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucun remboursement trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRemboursements.map(r => (
                        <TableRow key={r.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{r.tiersPayant.patient.nom} {r.tiersPayant.patient.prenom}</span>
                              <span className="text-[10px] text-muted-foreground">{r.tiersPayant.organisme.nom}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">{formatFCFA(r.montantTotal)}</TableCell>
                          <TableCell className="text-right text-sm font-semibold text-[#1D9E75]">{formatFCFA(r.montantPrisEnCharge)}</TableCell>
                          <TableCell className="text-right text-sm">{formatFCFA(r.montantPatient)}</TableCell>
                          <TableCell className="text-center">{getStatutBadge(r.statut)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.dateSoumission).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.dateRemboursement ? new Date(r.dateRemboursement).toLocaleDateString('fr-FR') : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Organisme Dialog */}
      <Dialog open={addOrgDialogOpen} onOpenChange={setAddOrgDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel organisme</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input placeholder="CNSS, RAMU..." value={orgNom} onChange={e => setOrgNom(e.target.value)} />
              </div>
              <div>
                <Label>Code *</Label>
                <Input placeholder="Code unique" value={orgCode} onChange={e => setOrgCode(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={orgType} onValueChange={setOrgType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CNSS">CNSS</SelectItem>
                    <SelectItem value="RAMU">RAMU</SelectItem>
                    <SelectItem value="ASSURANCE_PRIVEE">Assurance privée</SelectItem>
                    <SelectItem value="MUTUELLE">Mutuelle</SelectItem>
                    <SelectItem value="AUTRE">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Taux remboursement (%)</Label>
                <Input type="number" placeholder="80" value={orgTaux} onChange={e => setOrgTaux(e.target.value)} />
              </div>
            </div>
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddOrganisme}>
              Enregistrer l&apos;organisme
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Tiers Payant Dialog */}
      <Dialog open={addTpDialogOpen} onOpenChange={setAddTpDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau tiers payant</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Patient *</Label>
              <Select value={tpPatientId} onValueChange={setTpPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom} {p.prenom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Organisme *</Label>
              <Select value={tpOrganismeId} onValueChange={setTpOrganismeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un organisme" />
                </SelectTrigger>
                <SelectContent>
                  {organismes.filter(o => o.actif).map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.nom} ({o.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>N° Adhésion *</Label>
                <Input placeholder="Numéro d'adhésion" value={tpNumero} onChange={e => setTpNumero(e.target.value)} />
              </div>
              <div>
                <Label>Taux prise en charge (%)</Label>
                <Input type="number" placeholder="80" value={tpTaux} onChange={e => setTpTaux(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Plafond annuel (FCFA)</Label>
              <Input type="number" placeholder="Optionnel" value={tpPlafond} onChange={e => setTpPlafond(e.target.value)} />
            </div>
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddTiersPayant}>
              Enregistrer le tiers payant
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Remboursement Dialog */}
      <Dialog open={addRembDialogOpen} onOpenChange={setAddRembDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Soumettre un remboursement</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Tiers payant *</Label>
              <Select value={rembTiersPayantId} onValueChange={setRembTiersPayantId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un tiers payant" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {tiersPayants.filter(tp => tp.actif).map(tp => (
                    <SelectItem key={tp.id} value={tp.id}>
                      {tp.patient.nom} {tp.patient.prenom} — {tp.organisme.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant total (FCFA) *</Label>
              <Input type="number" placeholder="0" value={rembMontantTotal} onChange={e => setRembMontantTotal(e.target.value)} />
            </div>
            {rembTiersPayantId && rembMontantTotal && (
              <div className="bg-[#E1F5EE] rounded-lg p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-[#085041]">Montant total</span>
                  <span className="font-medium">{formatFCFA(parseFloat(rembMontantTotal) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#085041]">Pris en charge</span>
                  <span className="font-semibold text-[#1D9E75]">
                    {formatFCFA(Math.round((parseFloat(rembMontantTotal) || 0) * (tiersPayants.find(tp => tp.id === rembTiersPayantId)?.tauxPriseEnCharge || 80) / 100))}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#085041]">Reste patient</span>
                  <span className="font-medium">
                    {formatFCFA((parseFloat(rembMontantTotal) || 0) - Math.round((parseFloat(rembMontantTotal) || 0) * (tiersPayants.find(tp => tp.id === rembTiersPayantId)?.tauxPriseEnCharge || 80) / 100))}
                  </span>
                </div>
              </div>
            )}
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleSubmitRemboursement}>
              Soumettre le remboursement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
