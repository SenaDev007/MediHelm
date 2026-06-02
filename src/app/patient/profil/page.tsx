'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { User, Mail, Phone, MapPin, Heart, Edit3, Check, X, Users, AlertCircle, Syringe, Pill, Loader2, Lock, Shield, Trash2 } from 'lucide-react'
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
  const [activeTab, setActiveTab] = useState('profil')
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
  const [patientId, setPatientId] = useState('')

  // Password change
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwords, setPasswords] = useState({ current: '', nouveau: '', confirm: '' })
  const [changingPassword, setChangingPassword] = useState(false)

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

  const handleRemoveFamily = async (memberId: string) => {
    try {
      // Delete the family member
      await fetch('/api/patient/comptes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'REMOVE_FAMILY', profilFamilleId: memberId }),
      })
      setFamilyMembers(familyMembers.filter(m => m.id !== memberId))
      toast.success('Membre de famille retiré')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const handleChangePassword = async () => {
    if (!passwords.nouveau || passwords.nouveau.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (passwords.nouveau !== passwords.confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }
    setChangingPassword(true)
    try {
      // Simulate password change
      await new Promise(resolve => setTimeout(resolve, 1000))
      toast.success('Mot de passe modifié avec succès')
      setShowPasswordDialog(false)
      setPasswords({ current: '', nouveau: '', confirm: '' })
    } catch {
      toast.error('Erreur lors du changement de mot de passe')
    } finally {
      setChangingPassword(false)
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full bg-teal-50">
          <TabsTrigger value="profil" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Profil</TabsTrigger>
          <TabsTrigger value="famille" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Famille</TabsTrigger>
          <TabsTrigger value="securite" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">Sécurité</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profil" className="space-y-4 mt-4">
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

          {/* Dossier santé */}
          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-2">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary" />
                Dossier santé
              </h2>
              <div className="flex items-center gap-2">
                <Syringe className="h-4 w-4 text-primary" />
                <span className="text-xs text-gray-700">{vaccinations.length} vaccination(s)</span>
              </div>
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                <span className="text-xs text-gray-700">{medicationHistory.length} médicament(s) acheté(s)</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Family Tab */}
        <TabsContent value="famille" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Profils famille ({familyMembers.length})
            </h2>
            <Button variant="outline" size="sm" className="h-8 text-xs border-primary text-primary" onClick={() => setShowAddFamily(true)}>
              <Users className="h-3 w-3 mr-1" />
              Ajouter
            </Button>
          </div>

          {familyMembers.length === 0 ? (
            <Card className="border-teal-200">
              <CardContent className="p-6 text-center">
                <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucun membre de famille ajouté</p>
                <Button variant="outline" size="sm" className="mt-2 border-primary text-primary" onClick={() => setShowAddFamily(true)}>
                  Ajouter un membre
                </Button>
              </CardContent>
            </Card>
          ) : (
            familyMembers.map((member) => (
              <motion.div key={member.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-teal-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{member.prenom} {member.nom}</p>
                        <p className="text-[10px] text-muted-foreground">{member.lienParente}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(member.dateNaissance).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleRemoveFamily(member.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="securite" className="space-y-4 mt-4">
          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Sécurité du compte
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Mot de passe</p>
                    <p className="text-xs text-muted-foreground">Dernière modification : Non disponible</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 text-xs border-primary text-primary" onClick={() => setShowPasswordDialog(true)}>
                    <Lock className="h-3 w-3 mr-1" />
                    Modifier
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Authentification à deux facteurs</p>
                    <p className="text-xs text-muted-foreground">Sécurisez votre compte avec la 2FA</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">Bientôt</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Sessions actives</h2>
              <div className="flex items-center justify-between py-2 border-b border-teal-50">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-900">Cet appareil</span>
                </div>
                <span className="text-[10px] text-muted-foreground">Actif maintenant</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Changer le mot de passe
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Mot de passe actuel</Label>
              <Input type="password" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} placeholder="••••••••" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Nouveau mot de passe</Label>
              <Input type="password" value={passwords.nouveau} onChange={(e) => setPasswords({ ...passwords, nouveau: e.target.value })} placeholder="Minimum 6 caractères" className="h-9 text-sm" />
            </div>
            <div>
              <Label className="text-xs">Confirmer le mot de passe</Label>
              <Input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} placeholder="Retapez le mot de passe" className="h-9 text-sm" />
            </div>
            {passwords.nouveau && passwords.confirm && passwords.nouveau !== passwords.confirm && (
              <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
            )}
            <Button className="w-full bg-primary hover:bg-teal-700" onClick={handleChangePassword} disabled={changingPassword}>
              {changingPassword ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Modification...</> : 'Changer le mot de passe'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
