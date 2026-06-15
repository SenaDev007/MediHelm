'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  User, Mail, Phone, Lock, Eye, EyeOff,
  AlertCircle, Loader2, ArrowLeft, Check, X
} from 'lucide-react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'

interface ValidationErrors {
  nom?: string
  prenom?: string
  email?: string
  telephone?: string
  password?: string
  confirmPassword?: string
}

export default function InscriptionPage() {
  const router = useRouter()
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [telephone, setTelephone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errors, setErrors] = useState<ValidationErrors>({})
  const [success, setSuccess] = useState(false)

  // Password strength
  const getPasswordStrength = (pwd: string) => {
    let score = 0
    if (pwd.length >= 8) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++
    return score
  }

  const passwordStrength = getPasswordStrength(password)
  const strengthLabel = ['', 'Très faible', 'Faible', 'Moyen', 'Fort', 'Très fort'][passwordStrength]
  const strengthColor = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-400', 'bg-green-600'][passwordStrength]

  const validate = (): boolean => {
    const newErrors: ValidationErrors = {}

    if (!nom.trim()) newErrors.nom = 'Le nom est obligatoire'
    if (!prenom.trim()) newErrors.prenom = 'Le prénom est obligatoire'

    if (!email.trim()) {
      newErrors.email = 'L\'email est obligatoire'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Adresse email invalide'
    }

    if (!telephone.trim()) {
      newErrors.telephone = 'Le téléphone est obligatoire'
    } else if (!/^(\+229|229|0)?[5-9]\d{7}$/.test(telephone.replace(/\s/g, ''))) {
      newErrors.telephone = 'Numéro béninois invalide (ex: 97000000)'
    }

    if (!password) {
      newErrors.password = 'Le mot de passe est obligatoire'
    } else if (password.length < 8) {
      newErrors.password = 'Minimum 8 caractères'
    } else if (getPasswordStrength(password) < 3) {
      newErrors.password = 'Mot de passe trop faible'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer le mot de passe'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!validate()) return

    setLoading(true)
    try {
      const res = await fetch('/api/patient/comptes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          motDePasse: password,
          nom: nom.trim(),
          prenom: prenom.trim(),
          telephone: telephone.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 409) {
          setError('Un compte avec cet email existe déjà. Connectez-vous.')
        } else {
          setError(data.error || 'Erreur lors de la création du compte')
        }
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/patient/connexion')
      }, 2500)
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const passwordChecks = [
    { label: 'Au moins 8 caractères', valid: password.length >= 8 },
    { label: 'Une majuscule', valid: /[A-Z]/.test(password) },
    { label: 'Un chiffre', valid: /[0-9]/.test(password) },
    { label: 'Un caractère spécial', valid: /[^A-Za-z0-9]/.test(password) },
  ]

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Success state */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-teal-800 mb-2">Compte créé !</h2>
              <p className="text-sm text-muted-foreground">
                Votre compte patient a été créé avec succès.
                Vous allez être redirigé vers la page de connexion.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!success && (
          <>
            {/* Logo & Header */}
            <div className="text-center mb-5">
              <Image src="/logo-MediHelm-01.png" alt="MediHelm" width={56} height={56} className="mx-auto mb-3" />
              <h1 className="text-xl font-bold text-teal-800">Créer un compte</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Rejoignez MediHelm Patient gratuitement
              </p>
            </div>

            {/* Registration Form */}
            <Card className="border-teal-200">
              <CardContent className="p-5">
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Global error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                    >
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-700">{error}</p>
                    </motion.div>
                  )}

                  {/* Nom & Prénom row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nom" className="text-xs font-medium text-gray-900">Nom</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nom"
                          placeholder="Doe"
                          value={nom}
                          onChange={(e) => { setNom(e.target.value); setErrors({ ...errors, nom: undefined }) }}
                          className={`pl-10 h-10 border-teal-200 ${errors.nom ? 'border-red-400' : ''}`}
                          disabled={loading}
                        />
                      </div>
                      {errors.nom && <p className="text-[10px] text-red-500">{errors.nom}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="prenom" className="text-xs font-medium text-gray-900">Prénom</Label>
                      <Input
                        id="prenom"
                        placeholder="Jean"
                        value={prenom}
                        onChange={(e) => { setPrenom(e.target.value); setErrors({ ...errors, prenom: undefined }) }}
                        className={`h-10 border-teal-200 ${errors.prenom ? 'border-red-400' : ''}`}
                        disabled={loading}
                      />
                      {errors.prenom && <p className="text-[10px] text-red-500">{errors.prenom}</p>}
                    </div>
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-email" className="text-xs font-medium text-gray-900">Adresse email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="votre@email.com"
                        value={email}
                        onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: undefined }) }}
                        className={`pl-10 h-10 border-teal-200 ${errors.email ? 'border-red-400' : ''}`}
                        autoComplete="email"
                        disabled={loading}
                      />
                    </div>
                    {errors.email && <p className="text-[10px] text-red-500">{errors.email}</p>}
                  </div>

                  {/* Téléphone */}
                  <div className="space-y-1.5">
                    <Label htmlFor="telephone" className="text-xs font-medium text-gray-900">Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="telephone"
                        type="tel"
                        placeholder="97000000"
                        value={telephone}
                        onChange={(e) => { setTelephone(e.target.value); setErrors({ ...errors, telephone: undefined }) }}
                        className={`pl-10 h-10 border-teal-200 ${errors.telephone ? 'border-red-400' : ''}`}
                        disabled={loading}
                      />
                    </div>
                    {errors.telephone && <p className="text-[10px] text-red-500">{errors.telephone}</p>}
                  </div>

                  {/* Mot de passe */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password" className="text-xs font-medium text-gray-900">Mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="reg-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimum 8 caractères"
                        value={password}
                        onChange={(e) => { setPassword(e.target.value); setErrors({ ...errors, password: undefined }) }}
                        className={`pl-10 pr-10 h-10 border-teal-200 ${errors.password ? 'border-red-400' : ''}`}
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-[10px] text-red-500">{errors.password}</p>}

                    {/* Password strength */}
                    {password.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full ${
                                level <= passwordStrength ? strengthColor : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          Force : <span className="font-medium">{strengthLabel}</span>
                        </p>
                        <div className="space-y-1">
                          {passwordChecks.map((check) => (
                            <div key={check.label} className="flex items-center gap-1.5">
                              {check.valid ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <X className="h-3 w-3 text-gray-300" />
                              )}
                              <span className={`text-[10px] ${check.valid ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {check.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirmer mot de passe */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirm-password" className="text-xs font-medium text-gray-900">
                      Confirmer le mot de passe
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Retapez votre mot de passe"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: undefined }) }}
                        className={`pl-10 pr-10 h-10 border-teal-200 ${errors.confirmPassword ? 'border-red-400' : ''}`}
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[10px] text-red-500">{errors.confirmPassword}</p>
                    )}
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary hover:bg-teal-700 text-sm font-semibold"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Création du compte...
                      </>
                    ) : (
                      'Créer mon compte'
                    )}
                  </Button>
                </form>

                <Separator className="my-4 bg-teal-100" />

                {/* Login link */}
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    Déjà un compte ?{' '}
                    <Link href="/patient/connexion" className="text-primary font-semibold hover:underline">
                      Se connecter
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Back link */}
            <div className="text-center mt-4">
              <Link
                href="/patient/connexion"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Retour à la connexion
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="mt-5">
              <div className="flex items-center justify-center gap-3">
                <Badge variant="secondary" className="bg-teal-50 text-teal-800 border-0 text-[10px]">
                  🔒 Données chiffrées
                </Badge>
                <Badge variant="secondary" className="bg-teal-50 text-teal-800 border-0 text-[10px]">
                  🇧🇯 Conforme Bénin
                </Badge>
                <Badge variant="secondary" className="bg-teal-50 text-teal-800 border-0 text-[10px]">
                  💯 Gratuit
                </Badge>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
