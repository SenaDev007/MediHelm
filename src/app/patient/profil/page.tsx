'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { User, Mail, Phone, MapPin, Heart, Edit3, Check, X, Users, AlertCircle } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProfilPage() {
  const [editing, setEditing] = useState(false)
  const [profile, setProfile] = useState({
    nom: 'Doe',
    prenom: 'Jean',
    telephone: '+229 97 00 00 00',
    email: 'jean.doe@email.com',
    adresse: 'Cotonou, Bénin',
    dateNaissance: '1990-01-15',
    sexe: 'M',
  })
  const [allergies, setAllergies] = useState(['Pénicilline', 'Sulfamides'])
  const [antecedents, setAntecedents] = useState(['Hypertension artérielle'])
  const [familyMembers] = useState([
    { id: '1', nom: 'Doe', prenom: 'Marie', lienParente: 'Épouse', dateNaissance: '1992-05-20' },
    { id: '2', nom: 'Doe', prenom: 'Paul', lienParente: 'Fils', dateNaissance: '2018-03-10' },
  ])
  const [newAllergy, setNewAllergy] = useState('')
  const [newAntecedent, setNewAntecedent] = useState('')

  const handleSave = () => {
    setEditing(false)
    // Save to API in production
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
        >
          {editing ? (
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
                <Input
                  value={profile.prenom}
                  onChange={(e) => setProfile({ ...profile, prenom: e.target.value })}
                  className="h-8 text-xs"
                />
              ) : (
                <p className="text-sm text-gray-900">{profile.prenom}</p>
              )}
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Nom</Label>
              {editing ? (
                <Input
                  value={profile.nom}
                  onChange={(e) => setProfile({ ...profile, nom: e.target.value })}
                  className="h-8 text-xs"
                />
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
              <Input
                value={profile.telephone}
                onChange={(e) => setProfile({ ...profile, telephone: e.target.value })}
                className="h-8 text-xs"
              />
            ) : (
              <p className="text-sm text-gray-900">{profile.telephone}</p>
            )}
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3" /> Email
            </Label>
            {editing ? (
              <Input
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="h-8 text-xs"
              />
            ) : (
              <p className="text-sm text-gray-900">{profile.email}</p>
            )}
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3" /> Adresse
            </Label>
            {editing ? (
              <Input
                value={profile.adresse}
                onChange={(e) => setProfile({ ...profile, adresse: e.target.value })}
                className="h-8 text-xs"
              />
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
                if (newAllergy) {
                  setAllergies([...allergies, newAllergy])
                  setNewAllergy('')
                }
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
                if (newAntecedent) {
                  setAntecedents([...antecedents, newAntecedent])
                  setNewAntecedent('')
                }
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
          <Button variant="outline" size="sm" className="w-full h-8 text-xs border-primary text-primary">
            <Users className="h-3 w-3 mr-1" />
            Ajouter un membre
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
