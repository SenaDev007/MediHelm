'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { RotateCcw, Plus, AlertTriangle, FileWarning, Search, Pencil, Check, Upload, FileText, Calendar, Package, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

interface Medicament {
  id: string
  nomCommercial: string
  dci: string
  estStupefiant: boolean
  prixVente?: number
  lots?: { id: string; numeroLot: string; quantite: number; dateExpiration: string }[]
}

interface Fournisseur {
  id: string
  nom: string
  code: string
}

interface Utilisateur {
  id: string
  nom: string
  prenom: string
}

interface Retour {
  id: string
  medicamentId: string
  lotId: string | null
  typeRetour: string
  quantite: number
  motif: string
  fournisseurId: string | null
  statut: string
  createdAt: string
  medicament: { nomCommercial: string; dci: string; estStupefiant: boolean; prixVente?: number }
  lot: { numeroLot: string; dateExpiration: string } | null
  fournisseur: { nom: string; code: string } | null
}

interface Destruction {
  id: string
  medicamentId: string
  lotId: string
  quantite: number
  motif: string
  dateDestruction: string
  pharmacienId: string
  temoinId: string | null
  pvUrl: string | null
  statut: string
  createdAt: string
  medicament: { nomCommercial: string; dci: string; estStupefiant: boolean; prixVente?: number }
  lot: { numeroLot: string; dateExpiration: string }
  pharmacien: { nom: string; prenom: string }
  temoin: { nom: string; prenom: string } | null
}

export default function RetoursPage() {
  const { pharmacie, user } = useAuth()
  const [activeTab, setActiveTab] = useState('retours')

  const [retours, setRetours] = useState<Retour[]>([])
  const [destructions, setDestructions] = useState<Destruction[]>([])
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Filters
  const [filterRetourType, setFilterRetourType] = useState<string>('all')
  const [filterRetourStatut, setFilterRetourStatut] = useState<string>('all')
  const [filterDestructionStatut, setFilterDestructionStatut] = useState<string>('all')

  // Dialogs
  const [addRetourDialogOpen, setAddRetourDialogOpen] = useState(false)
  const [addDestructionDialogOpen, setAddDestructionDialogOpen] = useState(false)
  const [traiterRetourDialogOpen, setTraiterRetourDialogOpen] = useState(false)
  const [updateDestructionDialogOpen, setUpdateDestructionDialogOpen] = useState(false)
  const [selectedRetour, setSelectedRetour] = useState<Retour | null>(null)
  const [selectedDestruction, setSelectedDestruction] = useState<Destruction | null>(null)

  // Retour form
  const [retMedicamentId, setRetMedicamentId] = useState('')
  const [retLotId, setRetLotId] = useState('')
  const [retType, setRetType] = useState('PERIME')
  const [retQuantite, setRetQuantite] = useState('')
  const [retMotif, setRetMotif] = useState('')
  const [retFournisseurId, setRetFournisseurId] = useState('')

  // Destruction form
  const [destMedicamentId, setDestMedicamentId] = useState('')
  const [destLotId, setDestLotId] = useState('')
  const [destQuantite, setDestQuantite] = useState('')
  const [destMotif, setDestMotif] = useState('')
  const [destDate, setDestDate] = useState(new Date().toISOString().slice(0, 10))
  const [destPharmacienId, setDestPharmacienId] = useState('')
  const [destTemoinId, setDestTemoinId] = useState('')

  const fetchAllData = async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const [retRes, destRes, medRes, fourRes, utilRes] = await Promise.all([
        fetch(`/api/retours?pharmacieId=${pharmacie.id}`),
        fetch(`/api/destructions?pharmacieId=${pharmacie.id}`),
        fetch(`/api/medicaments?pharmacieId=${pharmacie.id}`),
        fetch(`/api/fournisseurs?pharmacieId=${pharmacie.id}`),
        fetch(`/api/utilisateurs?pharmacieId=${pharmacie.id}`),
      ])
      if (retRes.ok) setRetours(await retRes.json())
      if (destRes.ok) setDestructions(await destRes.json())
      if (medRes.ok) setMedicaments(await medRes.json())
      if (fourRes.ok) setFournisseurs(await fourRes.json())
      if (utilRes.ok) setUtilisateurs(await utilRes.json())

      // Set current user as pharmacien
      if (user) {
        setDestPharmacienId(user.id)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [pharmacie?.id])

  // Selected medicament lots
  const selectedRetMed = useMemo(() => medicaments.find(m => m.id === retMedicamentId), [medicaments, retMedicamentId])
  const selectedDestMed = useMemo(() => medicaments.find(m => m.id === destMedicamentId), [medicaments, destMedicamentId])

  const filteredRetours = useMemo(() => {
    let result = [...retours]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(r =>
        r.medicament.nomCommercial.toLowerCase().includes(q) ||
        r.motif.toLowerCase().includes(q) ||
        (r.lot?.numeroLot || '').toLowerCase().includes(q)
      )
    }
    if (filterRetourType !== 'all') {
      result = result.filter(r => r.typeRetour === filterRetourType)
    }
    if (filterRetourStatut !== 'all') {
      result = result.filter(r => r.statut === filterRetourStatut)
    }
    return result
  }, [retours, search, filterRetourType, filterRetourStatut])

  const filteredDestructions = useMemo(() => {
    let result = [...destructions]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(d =>
        d.medicament.nomCommercial.toLowerCase().includes(q) ||
        d.motif.toLowerCase().includes(q) ||
        d.lot.numeroLot.toLowerCase().includes(q)
      )
    }
    if (filterDestructionStatut !== 'all') {
      result = result.filter(d => d.statut === filterDestructionStatut)
    }
    return result
  }, [destructions, search, filterDestructionStatut])

  // KPI calculations
  const now = new Date()
  const thisMonth = retours.filter(r => {
    const d = new Date(r.createdAt)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const retoursCeMois = thisMonth.length
  const valeurRetours = thisMonth.reduce((sum, r) => {
    const prix = (r.medicament as { prixVente?: number }).prixVente || 0
    return sum + (prix * r.quantite)
  }, 0)
  const enAttente = retours.filter(r => r.statut === 'EN_COURS').length
  const traites = retours.filter(r => r.statut === 'TRAITE').length

  const getTypeRetourBadge = (type: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PERIME: { label: 'Périmé', className: 'bg-red-100 text-red-800 border-0' },
      ENDOMMAGE: { label: 'Endommagé', className: 'bg-orange-100 text-orange-800 border-0' },
      ERREUR_LIVRAISON: { label: 'Erreur livraison', className: 'bg-blue-100 text-blue-800 border-0' },
      RAPPEL_LOT: { label: 'Rappel de lot', className: 'bg-purple-100 text-purple-800 border-0' },
    }
    const info = map[type] || { label: type, className: 'bg-gray-100 text-gray-800 border-0' }
    return <Badge className={`text-[9px] ${info.className}`}>{info.label}</Badge>
  }

  const getStatutRetourBadge = (statut: string) => {
    const map: Record<string, { label: string; className: string }> = {
      EN_COURS: { label: 'En attente', className: 'bg-amber-100 text-amber-800 border-0' },
      TRAITE: { label: 'Traité', className: 'bg-[#E1F5EE] text-[#085041] border-0' },
      ANNULE: { label: 'Annulé', className: 'bg-gray-100 text-gray-600 border-0' },
    }
    const info = map[statut] || { label: statut, className: 'bg-gray-100 text-gray-800 border-0' }
    return <Badge className={`text-[9px] ${info.className}`}>{info.label}</Badge>
  }

  const getStatutDestructionBadge = (statut: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PLANIFIEE: { label: 'Planifiée', className: 'bg-blue-100 text-blue-800 border-0' },
      EN_COURS: { label: 'En cours', className: 'bg-amber-100 text-amber-800 border-0' },
      EFFECTUEE: { label: 'Effectuée', className: 'bg-[#E1F5EE] text-[#085041] border-0' },
      PV_SIGNE: { label: 'PV signé', className: 'bg-[#1D9E75] text-white border-0' },
    }
    const info = map[statut] || { label: statut, className: 'bg-gray-100 text-gray-800 border-0' }
    return <Badge className={`text-[9px] ${info.className}`}>{info.label}</Badge>
  }

  const handleAddRetour = async () => {
    if (!pharmacie?.id || !retMedicamentId || !retQuantite) {
      toast.error('Médicament et quantité sont requis')
      return
    }
    try {
      const res = await fetch('/api/retours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          medicamentId: retMedicamentId,
          lotId: retLotId || null,
          typeRetour: retType,
          quantite: parseInt(retQuantite) || 0,
          motif: retMotif,
          fournisseurId: retFournisseurId || null,
          statut: 'EN_COURS',
        }),
      })
      if (res.ok) {
        toast.success('Retour enregistré avec succès')
        setAddRetourDialogOpen(false)
        resetRetourForm()
        fetchAllData()
      } else {
        toast.error("Erreur lors de l'enregistrement du retour")
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement du retour")
    }
  }

  const handleAddDestruction = async () => {
    if (!pharmacie?.id || !destMedicamentId || !destLotId || !destQuantite) {
      toast.error('Médicament, lot et quantité sont requis')
      return
    }
    try {
      const res = await fetch('/api/destructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          medicamentId: destMedicamentId,
          lotId: destLotId,
          quantite: parseInt(destQuantite) || 0,
          motif: destMotif,
          dateDestruction: destDate,
          pharmacienId: destPharmacienId,
          temoinId: destTemoinId || null,
          statut: 'PLANIFIEE',
        }),
      })
      if (res.ok) {
        toast.success('Destruction planifiée avec succès')
        setAddDestructionDialogOpen(false)
        resetDestructionForm()
        fetchAllData()
      } else {
        toast.error("Erreur lors de la planification de la destruction")
      }
    } catch {
      toast.error("Erreur lors de la planification de la destruction")
    }
  }

  const handleTraiterRetour = async () => {
    if (!selectedRetour) return
    try {
      const res = await fetch('/api/retours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRetour.id,
          pharmacieId: pharmacie?.id,
          medicamentId: selectedRetour.medicamentId,
          lotId: selectedRetour.lotId,
          typeRetour: selectedRetour.typeRetour,
          quantite: selectedRetour.quantite,
          motif: selectedRetour.motif,
          fournisseurId: selectedRetour.fournisseurId,
          statut: 'TRAITE',
        }),
      })
      if (res.ok) {
        toast.success('Retour marqué comme traité')
        setTraiterRetourDialogOpen(false)
        setSelectedRetour(null)
        fetchAllData()
      } else {
        toast.error('Erreur lors du traitement du retour')
      }
    } catch {
      toast.error('Erreur lors du traitement du retour')
    }
  }

  const handleUpdateDestructionStatut = async (newStatut: string) => {
    if (!selectedDestruction || !pharmacie?.id) return
    try {
      const res = await fetch('/api/destructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedDestruction.id,
          pharmacieId: pharmacie.id,
          medicamentId: selectedDestruction.medicamentId,
          lotId: selectedDestruction.lotId,
          quantite: selectedDestruction.quantite,
          motif: selectedDestruction.motif,
          dateDestruction: selectedDestruction.dateDestruction,
          pharmacienId: selectedDestruction.pharmacienId,
          temoinId: selectedDestruction.temoinId,
          statut: newStatut,
        }),
      })
      if (res.ok) {
        toast.success('Statut de destruction mis à jour')
        setUpdateDestructionDialogOpen(false)
        setSelectedDestruction(null)
        fetchAllData()
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const resetRetourForm = () => {
    setRetMedicamentId(''); setRetLotId(''); setRetType('PERIME'); setRetQuantite(''); setRetMotif(''); setRetFournisseurId('')
  }
  const resetDestructionForm = () => {
    setDestMedicamentId(''); setDestLotId(''); setDestQuantite(''); setDestMotif(''); setDestDate(new Date().toISOString().slice(0, 10)); setDestTemoinId('')
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
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
            <RotateCcw className="w-6 h-6 text-[#1D9E75]" />
            Retours & Destructions
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion des retours fournisseurs et destructions de médicaments
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Retours ce mois</span>
                <span className="text-xl font-bold block">{retoursCeMois}</span>
              </div>
              <Calendar className="w-8 h-8 text-gray-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Valeur retours</span>
                <span className="text-lg font-bold block text-amber-600">{formatFCFA(valeurRetours)}</span>
              </div>
              <Package className="w-8 h-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">En attente</span>
                <span className="text-xl font-bold block text-red-600">{enAttente}</span>
              </div>
              <Clock className="w-8 h-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Traités</span>
                <span className="text-xl font-bold block text-[#1D9E75]">{traites}</span>
              </div>
              <CheckCircle2 className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="retours">Retours</TabsTrigger>
            <TabsTrigger value="destructions">Destructions</TabsTrigger>
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
            {activeTab === 'retours' && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => { resetRetourForm(); setAddRetourDialogOpen(true) }}>
                <Plus className="w-4 h-4" /> Retour
              </Button>
            )}
            {activeTab === 'destructions' && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => { resetDestructionForm(); setAddDestructionDialogOpen(true) }}>
                <Plus className="w-4 h-4" /> Destruction
              </Button>
            )}
          </div>
        </div>

        {/* Retours Tab */}
        <TabsContent value="retours" className="mt-4">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterRetourType} onValueChange={setFilterRetourType}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    <SelectItem value="PERIME">Périmé</SelectItem>
                    <SelectItem value="ENDOMMAGE">Endommagé</SelectItem>
                    <SelectItem value="ERREUR_LIVRAISON">Erreur livraison</SelectItem>
                    <SelectItem value="RAPPEL_LOT">Rappel de lot</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterRetourStatut} onValueChange={setFilterRetourStatut}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="EN_COURS">En attente</SelectItem>
                    <SelectItem value="TRAITE">Traité</SelectItem>
                  </SelectContent>
                </Select>
                {(filterRetourType !== 'all' || filterRetourStatut !== 'all') && (
                  <Button variant="ghost" size="sm" onClick={() => { setFilterRetourType('all'); setFilterRetourStatut('all') }}>
                    Réinitialiser
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Médicament</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRetours.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Aucun retour trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRetours.map(r => (
                        <TableRow key={r.id} className="hover:bg-muted/30">
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{r.medicament.nomCommercial}</span>
                              <span className="text-[10px] text-muted-foreground">{r.medicament.dci}</span>
                              {r.medicament.estStupefiant && (
                                <Badge className="text-[8px] bg-purple-500 text-white border-0 w-fit mt-0.5">Stupéfiant</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.lot?.numeroLot || '—'}
                          </TableCell>
                          <TableCell>{getTypeRetourBadge(r.typeRetour)}</TableCell>
                          <TableCell className="text-center font-semibold text-sm">{r.quantite}</TableCell>
                          <TableCell className="text-sm">{r.fournisseur?.nom || '—'}</TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate" title={r.motif}>{r.motif}</TableCell>
                          <TableCell className="text-center">{getStatutRetourBadge(r.statut)}</TableCell>
                          <TableCell className="text-right">
                            {r.statut === 'EN_COURS' && (
                              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setSelectedRetour(r); setTraiterRetourDialogOpen(true) }} title="Marquer comme traité">
                                <Check className="w-4 h-4 text-[#1D9E75]" />
                              </Button>
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

        {/* Destructions Tab */}
        <TabsContent value="destructions" className="mt-4">
          {/* Alert Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-sm text-amber-800">Stupéfiants — Procès-verbal obligatoire</h3>
              <p className="text-xs text-amber-700 mt-1">
                Les destructions de médicaments stupéfiants nécessitent un PV signé par 2 témoins conformément à la réglementation en vigueur au Bénin.
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={filterDestructionStatut} onValueChange={setFilterDestructionStatut}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="PLANIFIEE">Planifiée</SelectItem>
                    <SelectItem value="EN_COURS">En cours</SelectItem>
                    <SelectItem value="EFFECTUEE">Effectuée</SelectItem>
                    <SelectItem value="PV_SIGNE">PV signé</SelectItem>
                  </SelectContent>
                </Select>
                {filterDestructionStatut !== 'all' && (
                  <Button variant="ghost" size="sm" onClick={() => setFilterDestructionStatut('all')}>
                    Réinitialiser
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Médicament</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Pharmacien</TableHead>
                      <TableHead>Témoin</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDestructions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          Aucune destruction trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDestructions.map(d => (
                        <TableRow key={d.id} className="hover:bg-muted/30">
                          <TableCell className="text-sm">
                            {new Date(d.dateDestruction).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{d.medicament.nomCommercial}</span>
                              <span className="text-[10px] text-muted-foreground">{d.medicament.dci}</span>
                              {d.medicament.estStupefiant && (
                                <Badge className="text-[8px] bg-purple-500 text-white border-0 w-fit mt-0.5">Stupéfiant</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{d.lot.numeroLot}</TableCell>
                          <TableCell className="text-center font-semibold text-sm">{d.quantite}</TableCell>
                          <TableCell className="text-sm max-w-[150px] truncate" title={d.motif}>{d.motif}</TableCell>
                          <TableCell className="text-sm">
                            {d.pharmacien.prenom} {d.pharmacien.nom}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {d.temoin ? `${d.temoin.prenom} ${d.temoin.nom}` : '—'}
                          </TableCell>
                          <TableCell className="text-center">{getStatutDestructionBadge(d.statut)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { setSelectedDestruction(d); setUpdateDestructionDialogOpen(true) }} title="Mettre à jour le statut">
                              <Pencil className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* PV Upload Placeholder */}
          <Card className="mt-4">
            <CardContent className="p-6">
              <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <FileText className="w-10 h-10 text-muted-foreground/40 mb-3" />
                <h3 className="font-semibold text-sm mb-1">Procès-verbaux de destruction</h3>
                <p className="text-xs text-muted-foreground mb-4 max-w-md">
                  Téléversez les PV signés pour les destructions de stupéfiants. Le PV doit être signé par le pharmacien responsable et 2 témoins.
                </p>
                <Button variant="outline" className="gap-2" disabled>
                  <Upload className="w-4 h-4" />
                  Téléverser un PV (bientôt disponible)
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Retour Dialog */}
      <Dialog open={addRetourDialogOpen} onOpenChange={setAddRetourDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1D9E75]" />
              Nouveau retour
            </DialogTitle>
            <DialogDescription>Enregistrez un retour de médicament</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Médicament *</Label>
              <Select value={retMedicamentId} onValueChange={v => { setRetMedicamentId(v); setRetLotId('') }}>
                <SelectTrigger>
                  <SelectValue placeholder="Rechercher un médicament..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {medicaments.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nomCommercial} {m.estStupefiant ? '⚠️' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRetMed?.lots && selectedRetMed.lots.length > 0 && (
              <div>
                <Label>Lot</Label>
                <Select value={retLotId} onValueChange={setRetLotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRetMed.lots.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.numeroLot} (qté: {l.quantite}, exp: {new Date(l.dateExpiration).toLocaleDateString('fr-FR')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type de retour *</Label>
                <Select value={retType} onValueChange={setRetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERIME">Périmé</SelectItem>
                    <SelectItem value="ENDOMMAGE">Endommagé</SelectItem>
                    <SelectItem value="ERREUR_LIVRAISON">Erreur de livraison</SelectItem>
                    <SelectItem value="RAPPEL_LOT">Rappel de lot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input type="number" placeholder="0" value={retQuantite} onChange={e => setRetQuantite(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Motif *</Label>
              <Textarea placeholder="Raison du retour" value={retMotif} onChange={e => setRetMotif(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Fournisseur</Label>
              <Select value={retFournisseurId} onValueChange={setRetFournisseurId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {fournisseurs.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nom} ({f.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddRetourDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddRetour} disabled={!retMedicamentId || !retQuantite}>
              Enregistrer le retour
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Destruction Dialog */}
      <Dialog open={addDestructionDialogOpen} onOpenChange={setAddDestructionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Planifier une destruction
            </DialogTitle>
            <DialogDescription>Planifiez la destruction d&apos;un médicament</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Médicament *</Label>
              <Select value={destMedicamentId} onValueChange={v => { setDestMedicamentId(v); setDestLotId('') }}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un médicament" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {medicaments.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nomCommercial} {m.estStupefiant ? '⚠️' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDestMed?.lots && selectedDestMed.lots.length > 0 && (
              <div>
                <Label>Lot *</Label>
                <Select value={destLotId} onValueChange={setDestLotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDestMed.lots.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.numeroLot} (qté: {l.quantite}, exp: {new Date(l.dateExpiration).toLocaleDateString('fr-FR')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantité *</Label>
                <Input type="number" placeholder="0" value={destQuantite} onChange={e => setDestQuantite(e.target.value)} />
              </div>
              <div>
                <Label>Date destruction *</Label>
                <Input type="date" value={destDate} onChange={e => setDestDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Motif *</Label>
              <Textarea placeholder="Raison de la destruction" value={destMotif} onChange={e => setDestMotif(e.target.value)} rows={2} />
            </div>
            <div>
              <Label>Pharmacien responsable</Label>
              <Select value={destPharmacienId} onValueChange={setDestPharmacienId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pharmacien" />
                </SelectTrigger>
                <SelectContent>
                  {utilisateurs.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.prenom} {u.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Témoin</Label>
              <Select value={destTemoinId} onValueChange={setDestTemoinId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un témoin (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {utilisateurs.filter(u => u.id !== destPharmacienId).map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.prenom} {u.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDestructionDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddDestruction} disabled={!destMedicamentId || !destLotId || !destQuantite}>
              Planifier la destruction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Traiter Retour Dialog */}
      <Dialog open={traiterRetourDialogOpen} onOpenChange={setTraiterRetourDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-[#1D9E75]" />
              Traiter le retour
            </DialogTitle>
            <DialogDescription>
              Marquer le retour de <strong>{selectedRetour?.medicament.nomCommercial}</strong> (qté: {selectedRetour?.quantite}) comme traité ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTraiterRetourDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleTraiterRetour}>
              Confirmer le traitement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Destruction Statut Dialog */}
      <Dialog open={updateDestructionDialogOpen} onOpenChange={setUpdateDestructionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#1D9E75]" />
              Mettre à jour la destruction
            </DialogTitle>
            <DialogDescription>
              {selectedDestruction?.medicament.nomCommercial} — Lot {selectedDestruction?.lot.numeroLot}
            </DialogDescription>
          </DialogHeader>
          {selectedDestruction && (
            <div className="py-4">
              <div className="bg-muted/50 rounded-lg p-3 mb-4">
                <div className="text-xs text-muted-foreground">Statut actuel</div>
                <div className="mt-1">{getStatutDestructionBadge(selectedDestruction.statut)}</div>
              </div>
              <Label>Nouveau statut</Label>
              <div className="grid grid-cols-1 gap-2 mt-2">
                {selectedDestruction.statut === 'PLANIFIEE' && (
                  <Button variant="outline" className="justify-start gap-2" onClick={() => handleUpdateDestructionStatut('EN_COURS')}>
                    <Clock className="w-4 h-4 text-amber-500" /> En cours
                  </Button>
                )}
                {(selectedDestruction.statut === 'PLANIFIEE' || selectedDestruction.statut === 'EN_COURS') && (
                  <Button variant="outline" className="justify-start gap-2" onClick={() => handleUpdateDestructionStatut('EFFECTUEE')}>
                    <CheckCircle2 className="w-4 h-4 text-[#1D9E75]" /> Effectuée
                  </Button>
                )}
                {selectedDestruction.statut === 'EFFECTUEE' && (
                  <Button variant="outline" className="justify-start gap-2" onClick={() => handleUpdateDestructionStatut('PV_SIGNE')}>
                    <FileText className="w-4 h-4 text-[#1D9E75]" /> PV signé
                  </Button>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateDestructionDialogOpen(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
