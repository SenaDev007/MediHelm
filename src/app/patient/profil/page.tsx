'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { User, Mail, Phone, MapPin, Heart, Edit3, Check, X, Users, AlertCircle, Syringe, Pill, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface FamilyMember {
  id: string
  nom: string
  prenom: string
  lienParente: string
  dateNaissance: string
}

interface VaccinationRecord {
  id: string
  vaccin: string
  dateVaccination: string
}

interface MedicationHistory {
  id: string
  nomCommercial: string
  dci: string
  dateVente: string
  quantite: number
}

export default function ProfilPage() {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState({
    id: '',
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    adresse: '',
    dateNaissance: '',
    sexe: '',
  })
  const [allergies, setAllergies] = useState<string[]>([])
  const [antecedents, setAntecedents] = useState<string[]>([])
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([])
  const [medicationHistory, setMedicationHistory] = useState<MedicationHistory[]>([])
  const [newAllergy, setNewAllergy] = useState('')
  const [newAntecedent, setNewAntecedent] = useState('')
  const [showAddFamily, setShowAddFamily] = useState(false)
  const [newFamily, setNewFamily] = useState({ nom: '', prenom: '', lienParente: '', dateNaissance: '' })
  const [addingFamily, setAddingFamily] = useState(false)
  const [showHealthRecord, setShowHealthRecord] = useState(false)
  const [patientId, setPatientId] = useState('')

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch('/api/patient/comptes')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          const compte = data[0]
          setProfile({
            id: compte.id,
            nom: compte.nom || '',
            prenom: compte.prenom || '',
            telephone: compte.telephone || '',
            email: compte.email || '',
            adresse: compte.adresse || '',
            dateNaissance: compte.dateNaissance ? new Date(compte.dateNaissance).toISOString().split('T')[0] : '',
            sexe: compte.sexe || '',
          })
          if (compte.profilsFamille) {
            setFamilyMembers(compte.profilsFamille.map((p: FamilyMember & { dateNaissance: string }) => ({
              ...p,
              dateNaissance: new Date(p.dateNaissance).toISOString().split('T')[0],
            })))
          }

          // Fetch vaccinations using the compte ID
          const vaccRes = await fetch(`/api/patient/vaccinations?comptePatientId=${compte.id}`)
          if (vaccRes.ok) {
            const vaccData = await vaccRes.json()
            if (Array.isArray(vaccData)) {
              setVaccinations(vaccData.map((v: VaccinationRecord) => ({
                id: v.id,
                vaccin: v.vaccin,
                dateVaccination: v.dateVaccination,
              })))
            }
          }
        }
      }

      const patientRes = await fetch('/api/patients')
      if (patientRes.ok) {
        const patients = await patientRes.json()
        if (Array.isArray(patients) && patients.length > 0) {
          const patient = patients[0]
          setPatientId(patient.id)
          setAllergies(patient.allergies ? (Array.isArray(patient.allergies) ? patient.allergies : []) : [])
          setAntecedents(patient.antecedents ? (Array.isArray(patient.antecedents) ? patient.antecedents : []) : [])

          // Fetch medication history from ventes
          const ventesRes = await fetch('/api/ventes')
          if (ventesRes.ok) {
            const ventesData = await ventesRes.json()
            if (Array.isArray(ventesData)) {
              const meds: MedicationHistory[] = []
              for (const vente of ventesData.slice(0, 10)) {
                if (vente.lignes && Array.isArray(vente.lignes)) {
                  for (const ligne of vente.lignes) {
                    if (ligne.medicament) {
                      meds.push({
                        id: ligne.id,
                        nomCommercial: ligne.medicament.nomCommercial,
                        dci: ligne.medicament.dci,
                        dateVente: vente.createdAt,
                        quantite: ligne.quantite,
                      })
                    }
                  }
                }
              }
              setMedicationHistory(meds)
            }
          }
        }
      }
    } catch {
      toast.error('Erreur lors du chargement du profil')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSave = async () => {
    setSaving(true)
    try {
      if (profile.id) {
        await fetch('/api/patient/comptes', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: profile.id,
            nom: profile.nom,
            prenom: profile.prenom,
            email: profile.email,
            adresse: profile.adresse,
            dateNaissance: profile.dateNaissance || null,
            sexe: profile.sexe,
          }),
        })
      }

      if (patientId) {
        await fetch(`/api/patients?id=${patientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            allergies,
            antecedents,
          }),
        })
      }

      setEditing(false)
      toast.success('Profil sauvegardé avec succès')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleAddFamily = async () => {
    if (!newFamily.nom || !newFamily.prenom || !newFamily.lienParente || !newFamily.dateNaissance) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    setAddingFamily(true)
    try {
      const res = await fetch('/api/patient/comptes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'ADD_FAMILY',
          comptePatientId: profile.id,
          ...newFamily,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        setFamilyMembers([...familyMembers, {
          id: created.id,
          nom: created.nom,
          prenom: created.prenom,
          lienParente: created.lienParente,
          dateNaissance: new Date(created.dateNaissance).toISOString().split('T')[0],
        }])
        setNewFamily({ nom: '', prenom: '', lienParente: '', dateNaissance: '' })
        setShowAddFamily(false)
        toast.success('Membre de famille ajouté')
      } else {
        const errData = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
        toast.error(errData.error || 'Erreur lors de l\'ajout du membre')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout du membre')
    } finally {
      setAddingFamily(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Profile header */}
      <div className="text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
          <User className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-lg font-bold text-teal-800">{profile.prenom} {profile.nom}</h1>
        <p className="text-xs text-muted-foreground">Patient MédiHelm</p>
      </div>

      {/* Edit button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs border-primary text-primary"
          onClick={() => editing ? handleSave() : setEditing(true)}
          disabled={saving}
        >
          {saving ? (
            <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Sauvegarde...</>
          ) : editing ? (
            <><Check className="h-3 w-3 mr-1" /> Enregistrer</>
          ) : (
            <><Edit3 className="h-3 w-3 mr-1" /> Modifier</>
          )}
        </Button>
      </div>

      {/* Personal Info */}
      <Card className="border-teal-200">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Informations personnelles</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] text-muted-foreground">Prénom</Label>
              {editing ? (
                <Input value={profile.prenom} onChange={(e) => setProfile({ ...profile, prenom: e.target.value })} className="h-8 text-xs" />
              ) : (
                <p className="text-sm text-gray-900">{profile.prenom}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Nom</Label>
              {editing ? (
                <Input value={profile.nom} onChange={(e) => setProfile({ ...profile, nom: e.target.value })} className="h-8 text-xs" />
              ) : (
                <p className="text-sm text-gray-900">{profile.nom}</p>
              )}
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Phone className="h-3 w-3" /> Téléphone
            </Label>
            {editing ? (
              <Input value={profile.telephone} onChange={(e) => setProfile({ ...profile, telephone: e.target.value })} className="h-8 text-xs" />
            ) : (
              <p className="text-sm text-gray-900">{profile.telephone}</p>
            )}
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            {editing ? (
              <Input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className="h-8 text-xs" />
            ) : (
              <p className="text-sm text-gray-900">{profile.email}</p>
            )}
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Adresse
            </Label>
            {editing ? (
              <Input value={profile.adresse} onChange={(e) => setProfile({ ...profile, adresse: e.target.value })} className="h-8 text-xs" />
            ) : (
              <p className="text-sm text-gray-900">{profile.adresse}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card className="border-teal-200">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            Allergies
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {allergies.map((allergy) => (
              <Badge key={allergy} variant="secondary" className="bg-red-50 text-red-700 border-0 text-xs">
                {allergy}
                {editing && (
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setAllergies(allergies.filter(a => a !== allergy))} />
                )}
              </Badge>
            ))}
            {allergies.length === 0 && <p className="text-xs text-muted-foreground">Aucune allergie renseignée</p>}
          </div>
          {editing && (
            <div className="flex gap-2">
              <Input
                value={newAllergy}
                onChange={(e) => setNewAllergy(e.target.value)}
                placeholder="Ajouter une allergie"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAllergy) {
                    setAllergies([...allergies, newAllergy])
                    setNewAllergy('')
                  }
                }}
              />
              <Button size="sm" className="h-8 bg-primary" onClick={() => {
                if (newAllergy) { setAllergies([...allergies, newAllergy]); setNewAllergy('') }
              }}>+</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Antecedents */}
      <Card className="border-teal-200">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Heart className="h-4 w-4 text-primary" />
            Antécédents
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {antecedents.map((ant) => (
              <Badge key={ant} variant="secondary" className="bg-teal-50 text-teal-800 border-0 text-xs">
                {ant}
                {editing && (
                  <X className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setAntecedents(antecedents.filter(a => a !== ant))} />
                )}
              </Badge>
            ))}
            {antecedents.length === 0 && <p className="text-xs text-muted-foreground">Aucun antécédent renseigné</p>}
          </div>
          {editing && (
            <div className="flex gap-2">
              <Input
                value={newAntecedent}
                onChange={(e) => setNewAntecedent(e.target.value)}
                placeholder="Ajouter un antécédent"
                className="h-8 text-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newAntecedent) {
                    setAntecedents([...antecedents, newAntecedent])
                    setNewAntecedent('')
                  }
                }}
              />
              <Button size="sm" className="h-8 bg-primary" onClick={() => {
                if (newAntecedent) { setAntecedents([...antecedents, newAntecedent]); setNewAntecedent('') }
              }}>+</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Family Profiles */}
      <Card className="border-teal-200">
        <CardContent className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Profils famille
          </h2>
          {familyMembers.map((member) => (
            <div key={member.id} className="flex items-center gap-3 py-2 border-b border-teal-50 last:border-0">
              <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{member.prenom} {member.nom}</p>
                <p className="text-[10px] text-muted-foreground">{member.lienParente}</p>
              </div>
              <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-800 border-0">
                {new Date(member.dateNaissance).toLocaleDateString('fr-FR')}
              </Badge>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full h-8 text-xs border-primary text-primary" onClick={() => setShowAddFamily(true)}>
            <Users className="h-3 w-3 mr-1" />
            Ajouter un membre
          </Button>
        </CardContent>
      </Card>

      {/* Health Record */}
      <Card className="border-teal-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              Dossier santé
            </h2>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => setShowHealthRecord(!showHealthRecord)}>
              {showHealthRecord ? 'Masquer' : 'Voir tout'}
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Syringe className="h-4 w-4 text-primary" />
              <span className="text-xs text-gray-700">{vaccinations.length} vaccination(s)</span>
            </div>
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              <span className="text-xs text-gray-700">{medicationHistory.length} médicament(s) acheté(s)</span>
            </div>
          </div>

          {showHealthRecord && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3 pt-2 border-t border-teal-100">
              <div>
                <h3 className="text-xs font-semibold text-gray-800 mb-1">Historique vaccinations</h3>
                {vaccinations.length > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {vaccinations.map((v) => (
                      <div key={v.id} className="flex items-center gap-2 text-xs">
                        <Syringe className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="text-gray-700">{v.vaccin}</span>
                        <span className="text-muted-foreground ml-auto">{new Date(v.dateVaccination).toLocaleDateString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune vaccination enregistrée</p>
                )}
              </div>
              <div>
                <h3 className="text-xs font-semibold text-gray-800 mb-1">Historique achats médicaments</h3>
                {medicationHistory.length > 0 ? (
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {medicationHistory.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-xs">
                        <Pill className="h-3 w-3 text-primary flex-shrink-0" />
                        <span className="text-gray-700">{m.nomCommercial}</span>
                        <span className="text-muted-foreground">x{m.quantite}</span>
                        <span className="text-muted-foreground ml-auto">{new Date(m.dateVente).toLocaleDateString('fr-FR')}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucun achat enregistré</p>
                )}
              </div>
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* Add Family Dialog */}
      <Dialog open={showAddFamily} onOpenChange={setShowAddFamily}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un membre de famille</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Prénom</Label>
              <Input value={newFamily.prenom} onChange={(e) => setNewFamily({ ...newFamily, prenom: e.target.value })} placeholder="Prénom" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Nom</Label>
              <Input value={newFamily.nom} onChange={(e) => setNewFamily({ ...newFamily, nom: e.target.value })} placeholder="Nom" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Lien de parenté</Label>
              <Input value={newFamily.lienParente} onChange={(e) => setNewFamily({ ...newFamily, lienParente: e.target.value })} placeholder="Ex: Épouse, Fils, Fille..." className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Date de naissance</Label>
              <Input type="date" value={newFamily.dateNaissance} onChange={(e) => setNewFamily({ ...newFamily, dateNaissance: e.target.value })} className="h-9 text-sm" />
            </div>
            <Button className="w-full bg-primary hover:bg-teal-700" onClick={handleAddFamily} disabled={addingFamily}>
              {addingFamily ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Ajout...</> : 'Ajouter'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
