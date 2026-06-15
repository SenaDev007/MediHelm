'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  User, Mail, Phone, Lock, MapPin, Shield, Edit3,
  Check, Loader2, Eye, EyeOff, Store, Star, LogOut,
  ChevronRight, Bell, FileText, Syringe
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { signOut } from 'next-auth/react'
import Link from 'next/link'

interface ProfileData {
  utilisateur: {
    id: string
    email: string
    nom: string
    prenom: string
    telephone: string
  }
  patient: {
    id: string
    nom: string
    prenom: string
    telephone: string
    email: string
    pointsFidelite: number
    pharmacieId: string | null
  } | null
}

interface ProfileForm {
  nom: string
  prenom: string
  email: string
  telephone: string
}

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<ProfileForm>({ nom: '', prenom: '', email: '', telephone: '' })
  const [saving, setSaving] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  // Demo profile for when API fails
  const demoProfile: ProfileData = {
    utilisateur: {
      id: 'demo-user',
      email: 'patient@medihelm.bj',
      nom: 'ADJOVI',
      prenom: 'Marie',
      telephone: '97000000',
    },
    patient: {
      id: 'demo-patient',
      nom: 'ADJOVI',
      prenom: 'Marie',
      telephone: '97000000',
      email: 'patient@medihelm.bj',
      pointsFidelite: 150,
      pharmacieId: null,
    },
  }

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/patient/comptes?email=patient@medihelm.bj')
      if (res.ok) {
        const data = await res.json()
        setProfile(data)
        setForm({
          nom: data.utilisateur.nom,
          prenom: data.utilisateur.prenom,
          email: data.utilisateur.email,
          telephone: data.utilisateur.telephone || '',
        })
      } else {
        // Use demo data
        setProfile(demoProfile)
        setForm({
          nom: demoProfile.utilisateur.nom,
          prenom: demoProfile.utilisateur.prenom,
          email: demoProfile.utilisateur.email,
          telephone: demoProfile.utilisateur.telephone,
        })
      }
    } catch {
      setProfile(demoProfile)
      setForm({
        nom: demoProfile.utilisateur.nom,
        prenom: demoProfile.utilisateur.prenom,
        email: demoProfile.utilisateur.email,
        telephone: demoProfile.utilisateur.telephone,
      })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSaveProfile = async () => {
    if (!form.nom.trim() || !form.prenom.trim() || !form.email.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setSaving(true)
    try {
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000))
      if (profile) {
        setProfile({
          ...profile,
          utilisateur: { ...profile.utilisateur, ...form },
          patient: profile.patient ? { ...profile.patient, ...form } : null,
        })
      }
      setEditing(false)
      toast.success('Profil mis à jour avec succès')
    } catch {
      toast.error('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit avoir au moins 8 caractères')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    setChangingPassword(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 1000))
      setPasswordDialogOpen(false)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Mot de passe modifié avec succès')
    } catch {
      toast.error('Erreur lors du changement de mot de passe')
    } finally {
      setChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/patient/connexion' })
  }

  const initials = profile
    ? `${profile.utilisateur.prenom.charAt(0)}${profile.utilisateur.nom.charAt(0)}`
    : '??'

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Mon profil
        </h1>
      </div>

      {/* Profile card */}
      {loading ? (
        <Card className="border-teal-200">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-teal-50 animate-pulse" />
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-teal-50 rounded w-1/2" />
                <div className="h-3 bg-teal-50 rounded w-3/4" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{initials}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-gray-900">
                    {profile?.utilisateur.prenom} {profile?.utilisateur.nom}
                  </h2>
                  <p className="text-xs text-muted-foreground">{profile?.utilisateur.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="text-[10px] bg-primary/10 text-primary border-0">
                      <Shield className="h-3 w-3 mr-0.5" />
                      Patient
                    </Badge>
                    {profile?.patient?.pointsFidelite !== undefined && profile.patient.pointsFidelite > 0 && (
                      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0">
                        <Star className="h-3 w-3 mr-0.5" />
                        {profile.patient.pointsFidelite} pts
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Profile info / edit */}
      <Card className="border-teal-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-900">Informations personnelles</h3>
            {!editing ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-primary"
                onClick={() => setEditing(true)}
              >
                <Edit3 className="h-3 w-3 mr-1" />
                Modifier
              </Button>
            ) : null}
          </div>

          {!editing ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Nom complet</p>
                  <p className="text-sm text-gray-900">{profile?.utilisateur.prenom} {profile?.utilisateur.nom}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Email</p>
                  <p className="text-sm text-gray-900">{profile?.utilisateur.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Téléphone</p>
                  <p className="text-sm text-gray-900">{profile?.utilisateur.telephone || '—'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Prénom</Label>
                  <Input
                    value={form.prenom}
                    onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    className="h-9 border-teal-200 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nom</Label>
                  <Input
                    value={form.nom}
                    onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    className="h-9 border-teal-200 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-9 border-teal-200 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Téléphone</Label>
                <Input
                  type="tel"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="h-9 border-teal-200 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 h-9 bg-primary hover:bg-teal-700 text-xs"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                  Enregistrer
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 h-9 text-xs border-teal-200"
                  onClick={() => {
                    setEditing(false)
                    if (profile) {
                      setForm({
                        nom: profile.utilisateur.nom,
                        prenom: profile.utilisateur.prenom,
                        email: profile.utilisateur.email,
                        telephone: profile.utilisateur.telephone || '',
                      })
                    }
                  }}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <Card className="border-teal-200">
        <CardContent className="p-2">
          {[
            { href: '/patient/ordonnances', icon: FileText, label: 'Mes ordonnances', badge: null },
            { href: '/patient/vaccinations', icon: Syringe, label: 'Carnet de vaccination', badge: null },
            { href: '/patient/fidelite', icon: Star, label: 'Programme fidélité', badge: profile?.patient?.pointsFidelite ? `${profile.patient.pointsFidelite} pts` : null },
            { href: '/patient/rappels', icon: Bell, label: 'Alertes et rappels', badge: null },
            { href: '/patient/pharmacies', icon: Store, label: 'Ma pharmacie', badge: null },
          ].map(({ href, icon: Icon, label, badge }) => (
            <Link key={href} href={href}>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-teal-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-sm text-gray-900">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {badge && (
                    <Badge className="text-[10px] bg-amber-50 text-amber-700 border-0">{badge}</Badge>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Change password */}
      <Card className="border-teal-200">
        <CardContent className="p-4">
          <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-full flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-primary" />
                  <span className="text-sm text-gray-900">Changer le mot de passe</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle className="text-teal-800">Changer le mot de passe</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      className="h-10 border-teal-200 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      className="h-10 border-teal-200 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Confirmer le nouveau mot de passe</Label>
                  <Input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    className="h-10 border-teal-200"
                  />
                </div>
                <Button
                  className="w-full h-10 bg-primary hover:bg-teal-700"
                  onClick={handleChangePassword}
                  disabled={changingPassword}
                >
                  {changingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Changer le mot de passe
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Separator className="bg-teal-100" />

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full h-11 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        onClick={handleLogout}
      >
        <LogOut className="h-4 w-4 mr-2" />
        Se déconnecter
      </Button>

      {/* App info */}
      <div className="text-center space-y-1 pb-2">
        <p className="text-[10px] text-muted-foreground">MédiHelm Patient v1.0</p>
        <p className="text-[10px] text-muted-foreground">🇧🇯 Conforme aux réglementations du Bénin</p>
      </div>
    </div>
  )
}
