'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import {
  CreditCard,
  Plus,
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Patient {
  id: string
  nom: string
  prenom: string
  telephone: string | null
}

interface CreditPatient {
  id: string
  patientId: string
  pharmacieId: string
  montant: number
  montantPaye: number
  statut: string
  dateEcheance: string
  createdAt: string
  patient: Patient
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

const statutConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  EN_COURS: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Clock },
  PAYE: { label: 'Payé', color: 'bg-[#E1F5EE] text-[#085041]', icon: CheckCircle2 },
  EN_RETARD: { label: 'En retard', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
}

// === Main Component ===

export default function CreditsPage() {
  const { pharmacie } = useAuth()
  const [credits, setCredits] = useState<CreditPatient[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('all')

  // Add credit dialog
  const [addOpen, setAddOpen] = useState(false)
  const [addPatientId, setAddPatientId] = useState('')
  const [addMontant, setAddMontant] = useState('')
  const [addEcheance, setAddEcheance] = useState('')

  // Payment dialog
  const [payOpen, setPayOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<CreditPatient | null>(null)
  const [payMontant, setPayMontant] = useState('')

  const fetchData = async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const [creditsRes, patientsRes] = await Promise.all([
        fetch(`/api/credits?pharmacieId=${pharmacie.id}`),
        fetch(`/api/patients?pharmacieId=${pharmacie.id}`),
      ])
      if (creditsRes.ok) setCredits(await creditsRes.json())
      if (patientsRes.ok) setPatients(await patientsRes.json())
    } catch {
      setCredits([])
      setPatients([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [pharmacie?.id])

  // Filtered credits
  const filteredCredits = useMemo(() => {
    let result = [...credits]
    if (filterStatut !== 'all') {
      result = result.filter(c => c.statut === filterStatut)
    }
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(c =>
        c.patient.nom.toLowerCase().includes(q) ||
        c.patient.prenom.toLowerCase().includes(q)
      )
    }
    return result
  }, [credits, filterStatut, search])

  // Summary calculations
  const totalEnCours = credits.filter(c => c.statut === 'EN_COURS').reduce((s, c) => s + c.montant - c.montantPaye, 0)
  const totalPaye = credits.filter(c => c.statut === 'PAYE').reduce((s, c) => s + c.montant, 0)
  const totalEnRetard = credits.filter(c => c.statut === 'EN_RETARD').reduce((s, c) => s + c.montant - c.montantPaye, 0)

  const handleAddCredit = async () => {
    if (!pharmacie?.id || !addPatientId || !addMontant || !addEcheance) {
      toast.error('Tous les champs sont requis')
      return
    }
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: addPatientId,
          pharmacieId: pharmacie.id,
          montant: addMontant,
          dateEcheance: addEcheance,
        }),
      })
      if (res.ok) {
        toast.success('Crédit ajouté avec succès')
        setAddOpen(false)
        setAddPatientId('')
        setAddMontant('')
        setAddEcheance('')
        fetchData()
      } else {
        toast.error('Erreur lors de l\'ajout du crédit')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedCredit || !payMontant) {
      toast.error('Le montant est requis')
      return
    }

    const montant = parseFloat(payMontant)
    const reste = selectedCredit.montant - selectedCredit.montantPaye

    if (montant > reste) {
      toast.error(`Le montant ne peut pas dépasser le reste à payer (${formatFCFA(reste)})`)
      return
    }

    const newMontantPaye = selectedCredit.montantPaye + montant
    const newStatut = newMontantPaye >= selectedCredit.montant ? 'PAYE' : selectedCredit.statut

    try {
      const res = await fetch(`/api/credits?id=${selectedCredit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montantPaye: newMontantPaye,
          statut: newStatut,
        }),
      })
      if (res.ok) {
        toast.success(newStatut === 'PAYE' ? 'Crédit entièrement payé !' : 'Paiement partiel enregistré')
        setPayOpen(false)
        setSelectedCredit(null)
        setPayMontant('')
        fetchData()
      } else {
        toast.error('Erreur lors de l\'enregistrement du paiement')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const openPayDialog = (credit: CreditPatient) => {
    setSelectedCredit(credit)
    setPayMontant('')
    setPayOpen(true)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-12" />
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
            <CreditCard className="w-6 h-6 text-[#1D9E75]" />
            Crédits Patients
          </h1>
          <p className="text-sm text-muted-foreground">
            {credits.length} crédits enregistrés
          </p>
        </div>
        <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Nouveau crédit
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Crédits en cours</span>
                <span className="text-xl font-bold block text-blue-600">{formatFCFA(totalEnCours)}</span>
              </div>
              <Clock className="w-8 h-8 text-blue-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Total payé</span>
                <span className="text-xl font-bold block text-[#1D9E75]">{formatFCFA(totalPaye)}</span>
              </div>
              <CheckCircle2 className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">En retard</span>
                <span className="text-xl font-bold block text-red-600">{formatFCFA(totalEnRetard)}</span>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom de patient..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger className="w-44">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="EN_COURS">En cours</SelectItem>
                <SelectItem value="PAYE">Payé</SelectItem>
                <SelectItem value="EN_RETARD">En retard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Credits Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                  <TableHead className="text-right">Reste</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead>Échéance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCredits.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Aucun crédit trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCredits.map(c => {
                    const reste = c.montant - c.montantPaye
                    const config = statutConfig[c.statut] || statutConfig.EN_COURS
                    const StatutIcon = config.icon
                    const pctPaid = c.montant > 0 ? (c.montantPaye / c.montant) * 100 : 0

                    return (
                      <TableRow key={c.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{c.patient.prenom} {c.patient.nom}</p>
                            {c.patient.telephone && (
                              <p className="text-xs text-muted-foreground">{c.patient.telephone}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium text-sm">{formatFCFA(c.montant)}</TableCell>
                        <TableCell className="text-right text-sm text-[#1D9E75]">{formatFCFA(c.montantPaye)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatFCFA(reste)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-[9px] border-0 ${config.color}`}>
                            <StatutIcon className="w-3 h-3 mr-1" />
                            {config.label}
                          </Badge>
                          <Progress value={pctPaid} className="h-1 mt-1" />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(c.dateEcheance).toLocaleDateString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-right">
                          {c.statut !== 'PAYE' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openPayDialog(c)}>
                              <DollarSign className="w-3 h-3" /> Paiement
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Credit Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1D9E75]" />
              Nouveau crédit patient
            </DialogTitle>
            <DialogDescription>Enregistrer un nouveau crédit pour un patient</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Patient *</Label>
              <Select value={addPatientId} onValueChange={setAddPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Montant (FCFA) *</Label>
              <Input type="number" placeholder="50000" value={addMontant} onChange={e => setAddMontant(e.target.value)} />
            </div>
            <div>
              <Label>Date d&apos;échéance *</Label>
              <Input type="date" value={addEcheance} onChange={e => setAddEcheance(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddCredit} disabled={!addPatientId || !addMontant}>
              Enregistrer le crédit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#1D9E75]" />
              Enregistrer un paiement
            </DialogTitle>
            <DialogDescription>
              Crédit de {selectedCredit ? formatFCFA(selectedCredit.montant) : ''} —{' '}
              Reste: {selectedCredit ? formatFCFA(selectedCredit.montant - selectedCredit.montantPaye) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Patient</Label>
              <p className="text-sm font-medium">
                {selectedCredit?.patient.prenom} {selectedCredit?.patient.nom}
              </p>
            </div>
            <div>
              <Label>Montant du paiement (FCFA) *</Label>
              <Input
                type="number"
                placeholder="10000"
                value={payMontant}
                onChange={e => setPayMontant(e.target.value)}
              />
              {selectedCredit && (
                <p className="text-xs text-muted-foreground mt-1">
                  Reste à payer: {formatFCFA(selectedCredit.montant - selectedCredit.montantPaye)}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleRecordPayment} disabled={!payMontant}>
              Enregistrer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
