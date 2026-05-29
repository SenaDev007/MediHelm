'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Users, Search, Plus, Phone, Mail, CreditCard, Star, User } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

interface Patient {
  id: string
  nom: string
  prenom: string
  dateNaissance: string | null
  sexe: string | null
  telephone: string | null
  email: string | null
  adresse: string | null
  numeroCNSS: string | null
  organismeAssurance: string | null
  numeroAssurance: string | null
  estFidele: boolean
  pointsFidelite: number
  notes: string | null
  createdAt: string
  credits: {
    id: string
    montant: number
    montantPaye: number
    statut: string
    dateEcheance: string
  }[]
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

export default function PatientsPage() {
  const { pharmacie } = useAuth()
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      fetch(`/api/patients?pharmacieId=${pharmacie.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setPatients(data))
        .catch(() => setPatients([]))
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const filteredPatients = useMemo(() => {
    if (!search) return patients
    const q = search.toLowerCase()
    return patients.filter(p =>
      p.nom.toLowerCase().includes(q) ||
      p.prenom.toLowerCase().includes(q) ||
      (p.telephone && p.telephone.includes(q))
    )
  }, [patients, search])

  const totalCredits = patients.reduce((sum, p) =>
    sum + p.credits.reduce((s, c) => s + c.montant - c.montantPaye, 0), 0
  )
  const fideles = patients.filter(p => p.estFidele).length

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
            <Users className="w-6 h-6 text-primary" />
            Patients
          </h1>
          <p className="text-sm text-muted-foreground">
            {patients.length} patients enregistrés
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Nouveau patient
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau patient</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Nom</Label>
                  <Input placeholder="Nom de famille" />
                </div>
                <div>
                  <Label>Prénom</Label>
                  <Input placeholder="Prénom" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Téléphone</Label>
                  <Input placeholder="+229 97 00 00 00" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input placeholder="email@example.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Date de naissance</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>Sexe</Label>
                  <Input placeholder="M / F" />
                </div>
              </div>
              <Button className="w-full">Enregistrer le patient</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Total patients</span>
                <span className="text-xl font-bold block">{patients.length}</span>
              </div>
              <Users className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Patients fidèles</span>
                <span className="text-xl font-bold block text-primary">{fideles}</span>
              </div>
              <Star className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Crédits en cours</span>
                <span className="text-xl font-bold block text-amber-500">{formatFCFA(totalCredits)}</span>
              </div>
              <CreditCard className="w-8 h-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom, prénom, téléphone..."
          className="pl-9"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPatients.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun patient trouvé
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map(patient => {
            const creditEnCours = patient.credits.reduce((s, c) => s + c.montant - c.montantPaye, 0)

            return (
              <Card
                key={patient.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPatient(patient)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {patient.prenom} {patient.nom}
                        </span>
                        {patient.estFidele && (
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        )}
                      </div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {patient.telephone && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {patient.telephone}
                          </span>
                        )}
                        {patient.email && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {patient.email}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        {patient.organismeAssurance && (
                          <Badge variant="outline" className="text-[9px]">
                            {patient.organismeAssurance}
                          </Badge>
                        )}
                        {creditEnCours > 0 && (
                          <Badge className="text-[9px] bg-amber-400 text-gray-900 border-0">
                            Crédit: {formatFCFA(creditEnCours)}
                          </Badge>
                        )}
                        {patient.pointsFidelite > 0 && (
                          <Badge className="text-[9px] bg-primary/10 text-primary border-0">
                            {patient.pointsFidelite} pts
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* Patient Detail */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-lg">
          {selectedPatient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {selectedPatient.prenom} {selectedPatient.nom}
                  {selectedPatient.estFidele && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Date de naissance</span>
                      <p className="font-medium">{formatDate(selectedPatient.dateNaissance)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sexe</span>
                      <p className="font-medium">{selectedPatient.sexe || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Téléphone</span>
                      <p className="font-medium">{selectedPatient.telephone || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email</span>
                      <p className="font-medium">{selectedPatient.email || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">CNSS</span>
                      <p className="font-medium">{selectedPatient.numeroCNSS || '—'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Points fidélité</span>
                      <p className="font-medium text-primary">{selectedPatient.pointsFidelite} pts</p>
                    </div>
                  </div>

                  {selectedPatient.organismeAssurance && (
                    <div>
                      <span className="text-sm font-medium">Assurance</span>
                      <p className="text-sm">{selectedPatient.organismeAssurance} — N° {selectedPatient.numeroAssurance || '—'}</p>
                    </div>
                  )}

                  {selectedPatient.credits.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Crédits en cours</span>
                      <div className="space-y-2 mt-2">
                        {selectedPatient.credits.map(c => (
                          <div key={c.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm">
                            <div>
                              <span className="font-medium">{formatFCFA(c.montant)}</span>
                              <span className="text-xs text-muted-foreground ml-2">payé: {formatFCFA(c.montantPaye)}</span>
                            </div>
                            <div className="text-right">
                              <Badge
                                className={`text-[9px] ${c.statut === 'EN_COURS' ? 'bg-amber-400 text-gray-900' : 'bg-primary text-white'} border-0`}
                              >
                                {c.statut}
                              </Badge>
                              <span className="text-xs text-muted-foreground block">
                                Échéance: {formatDate(c.dateEcheance)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedPatient.notes && (
                    <div>
                      <span className="text-sm font-medium">Notes</span>
                      <p className="text-sm text-muted-foreground">{selectedPatient.notes}</p>
                    </div>
                  )}

                  <div className="text-xs text-muted-foreground">
                    Inscrit le {formatDate(selectedPatient.createdAt)}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
