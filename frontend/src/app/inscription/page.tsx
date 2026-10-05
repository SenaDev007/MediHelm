'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Logo } from '@/components/medihelm/Logo'
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  FileText,
  CreditCard,
  Search,
  ShieldCheck,
  Stethoscope,
  Calendar,
  Hash,
  ArrowLeftRight,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const planInfo = [
  {
    id: 'SEED',
    nom: 'Seed',
    prix: '19 900',
    description: 'Idéal pour démarrer',
    features: ['1-2 utilisateurs', '1 caisse', 'Stock basique', '500 Mo documents'],
  },
  {
    id: 'BLOOM',
    nom: 'Bloom',
    prix: '34 900',
    description: 'Pour les pharmacies en croissance',
    features: ['5 utilisateurs', '2 caisses', 'API grossistes', '1 Go documents'],
  },
  {
    id: 'CROWN',
    nom: 'Crown',
    prix: '54 900',
    description: 'Solution complète',
    features: ['10 utilisateurs', '4 caisses', 'Analytics IA', '5 Go documents'],
  },
  {
    id: 'NETWORK',
    nom: 'Network',
    prix: 'Sur devis',
    description: 'Pour les réseaux de pharmacies',
    features: ['Utilisateurs illimités', 'Caisses illimitées', 'API complète', 'Stockage illimité'],
  },
]

// Départements du Bénin — noms au format du registre ABMed
const departements = [
  'ALIBORI', 'ATACORA', 'ATLANTIQUE', 'BORGOU', 'COLLINES', 'COUFFO',
  'DONGA', 'LITTORAL', 'MONO', 'OUEME', 'PLATEAU', 'ZOU',
]

/** Libellé lisible : ALIBORI → Alibori */
function pretty(value: string | null | undefined): string {
  if (!value) return ''
  return value.charAt(0) + value.slice(1).toLowerCase()
}

// ─── Officine du registre officiel ABMed ─────────────────────────────────────
interface OfficineRegistre {
  id: string
  numeroAbmed: string
  nom: string
  departement: string | null
  zoneSanitaire: string | null
  commune: string | null
  arrondissement: string | null
  localisation: string | null
  adresse: string
  ville: string
  telephone: string
  email: string | null
  latitude: number | null
  longitude: number | null
  pharmacienTitulaire: string | null
  pharmacienResponsable: string | null
  contactPharmacien: string | null
  courrielPharmacien: string | null
  referenceAutorisation: string | null
  dateValiditeAbmed: string | null
  referenceQuitus: string | null
  numeroOnpb: string | null
  statutAbmed: string | null
  sourceUrlAbmed: string | null
  _count: { utilisateurs: number }
}

export default function InscriptionPage() {
  const router = useRouter()

  // ─── Mode d'inscription : registre ABMed ou nouvelle officine ───
  const [mode, setMode] = useState<'recherche' | 'nouvelle'>('recherche')

  // ─── Recherche au registre ABMed ───
  const [departementRecherche, setDepartementRecherche] = useState('')
  const [queryRecherche, setQueryRecherche] = useState('')
  const [resultats, setResultats] = useState<OfficineRegistre[]>([])
  const [rechercheLoading, setRechercheLoading] = useState(false)
  const [officineSelectionnee, setOfficineSelectionnee] = useState<OfficineRegistre | null>(null)

  // ─── Nouvelle officine — champs ABMed (formulaire de l'agence) ───
  const [nomPharmacie, setNomPharmacie] = useState('')
  const [adresse, setAdresse] = useState('')
  const [ville, setVille] = useState('')
  const [departement, setDepartement] = useState('')
  const [zoneSanitaire, setZoneSanitaire] = useState('')
  const [commune, setCommune] = useState('')
  const [arrondissement, setArrondissement] = useState('')
  const [localisation, setLocalisation] = useState('')
  const [telephone, setTelephone] = useState('')
  const [emailPharmacie, setEmailPharmacie] = useState('')
  const [numeroAgrement, setNumeroAgrement] = useState('')
  const [pharmacienTitulaire, setPharmacienTitulaire] = useState('')
  const [pharmacienResponsable, setPharmacienResponsable] = useState('')
  const [contactPharmacien, setContactPharmacien] = useState('')
  const [courrielPharmacien, setCourrielPharmacien] = useState('')
  const [dateValiditeAbmed, setDateValiditeAbmed] = useState('')
  const [referenceQuitus, setReferenceQuitus] = useState('')
  const [numeroOnpb, setNumeroOnpb] = useState('')

  // ─── Plan ───
  const [plan, setPlan] = useState('SEED')
  const [periodeFacturation, setPeriodeFacturation] = useState('MENSUEL')

  // ─── Compte administrateur ───
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // ─── State ───
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Recherche debouncée au registre ABMed
  const abortRef = useRef<AbortController | null>(null)
  const rechercher = useCallback(async (dept: string, q: string) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setRechercheLoading(true)
    try {
      const params = new URLSearchParams({ registre: 'abmed' })
      if (dept) params.set('departement', dept)
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`/api/pharmacies?${params.toString()}`, {
        signal: controller.signal,
      })
      if (res.ok) {
        const data = await res.json()
        setResultats(Array.isArray(data) ? data : [])
      } else {
        setResultats([])
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) setResultats([])
    } finally {
      if (!controller.signal.aborted) setRechercheLoading(false)
    }
  }, [])

  useEffect(() => {
    if (mode !== 'recherche') return
    if (!departementRecherche && !queryRecherche.trim()) {
      setResultats([])
      return
    }
    const t = setTimeout(() => rechercher(departementRecherche, queryRecherche), 300)
    return () => clearTimeout(t)
  }, [mode, departementRecherche, queryRecherche, rechercher])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (mode === 'recherche') {
      if (!officineSelectionnee) {
        setError('Sélectionnez votre officine dans le registre ABMed, ou choisissez « Inscrire une nouvelle officine »')
        return
      }
      if (officineSelectionnee._count.utilisateurs > 0) {
        setError('Cette officine a déjà un compte MediHelm. Contactez son titulaire ou le support.')
        return
      }
    } else {
      if (!nomPharmacie || !adresse || !ville || !departement || !telephone || !numeroAgrement) {
        setError('Veuillez remplir tous les champs obligatoires de l’officine')
        return
      }
    }
    if (!nom || !prenom || !email || !motDePasse) {
      setError('Veuillez remplir tous les champs de l’administrateur')
      return
    }
    if (motDePasse !== confirmation) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (motDePasse.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères')
      return
    }

    setIsSubmitting(true)

    try {
      const payload =
        mode === 'recherche'
          ? {
              officineId: officineSelectionnee!.id,
              email,
              motDePasse,
              nom,
              prenom,
              plan,
              periodeFacturation,
            }
          : {
              pharmacieNom: nomPharmacie,
              adresse,
              ville,
              departement,
              telephone,
              emailPharmacie: emailPharmacie || null,
              numeroAgrement,
              plan,
              periodeFacturation,
              email,
              motDePasse,
              nom,
              prenom,
              zoneSanitaire: zoneSanitaire || undefined,
              commune: commune || ville,
              arrondissement: arrondissement || undefined,
              localisation: localisation || adresse,
              pharmacienTitulaire: pharmacienTitulaire || undefined,
              pharmacienResponsable: pharmacienResponsable || pharmacienTitulaire || undefined,
              contactPharmacien: contactPharmacien || undefined,
              courrielPharmacien: courrielPharmacien || null,
              dateValiditeAbmed: dateValiditeAbmed || undefined,
              referenceQuitus: referenceQuitus || undefined,
              numeroOnpb: numeroOnpb || undefined,
            }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur lors de la création du compte')
      }

      router.push('/connexion?registered=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Fiche de l'officine sélectionnée au registre ───
  const ficheOfficine = (o: OfficineRegistre) => (
    <div className="rounded-xl border-2 border-[#1D9E75] bg-[#E1F5EE]/50 overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 pb-3" style={{ background: 'linear-gradient(135deg, #27B086 0%, #0F6E56 100%)' }}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-white shrink-0" />
            <span className="text-white font-bold truncate">{o.nom}</span>
          </div>
          <p className="text-[11px] text-[#CFF5E8] mt-0.5">
            Officine agréée ABMed · {o.numeroAbmed}
            {o.pharmacienTitulaire ? ` · Titulaire : ${o.pharmacienTitulaire}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="text-white/80 hover:text-white text-xs shrink-0 underline underline-offset-2"
          onClick={() => setOfficineSelectionnee(null)}
        >
          Changer
        </button>
      </div>
      <div className="p-4 text-sm space-y-1.5">
        {(o.localisation || o.adresse) && (
          <div className="flex items-start gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>{o.localisation || o.adresse}{o.ville ? `, ${o.ville}` : ''}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span>{o.telephone}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {o.departement && <Badge className="text-[10px] bg-[#0F6E56] text-white border-0">{pretty(o.departement)}</Badge>}
          {o.commune && <Badge className="text-[10px] bg-white text-[#0F6E56] border-[#1D9E75]/40">{o.commune}</Badge>}
          {o.zoneSanitaire && <Badge className="text-[10px] bg-[#FDF3E0] text-[#5B4A12] border-0">ZS {o.zoneSanitaire}</Badge>}
          {o.arrondissement && <Badge variant="secondary" className="text-[10px]">{o.arrondissement}</Badge>}
        </div>
        {o.referenceAutorisation && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground pt-1">
            <FileText className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Autorisation : {o.referenceAutorisation}{o.dateValiditeAbmed ? ` (du ${o.dateValiditeAbmed})` : ''}</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground pt-1">
          Ces données officielles du registre ABMed sont pré-remplies — vous n&apos;avez plus qu&apos;à créer votre compte.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold mt-4" style={{ color: '#085041' }}>
            Créez votre espace MediHelm
          </h1>
          <p className="text-muted-foreground mt-1">
            Inscrivez votre officine et commencez l&apos;essai gratuit de 14 jours
          </p>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {planInfo.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                plan === p.id
                  ? 'border-[#1D9E75] bg-[#E1F5EE]'
                  : 'border-border hover:border-[#1D9E75]/50'
              }`}
              onClick={() => setPlan(p.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm" style={{ color: '#085041' }}>
                  {p.nom}
                </span>
                {plan === p.id && (
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#1D9E75' }} />
                )}
              </div>
              <p className="text-lg font-bold" style={{ color: '#1D9E75' }}>
                {p.prix}
                {p.prix !== 'Sur devis' && (
                  <span className="text-xs font-normal text-muted-foreground"> FCFA/mois</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
              <ul className="mt-2 space-y-0.5">
                {p.features.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5 shrink-0" style={{ color: '#1D9E75' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* ─── Carte 1 : l'officine ─── */}
            <div className="space-y-4">
              {/* Sélection du mode */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-muted">
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-sm font-medium transition-all ${
                    mode === 'recherche' ? 'bg-white shadow text-[#0F6E56]' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => { setMode('recherche'); setOfficineSelectionnee(null) }}
                >
                  <Search className="h-4 w-4" />
                  Registre ABMed
                </button>
                <button
                  type="button"
                  className={`flex items-center justify-center gap-1.5 rounded-lg py-2.5 px-3 text-sm font-medium transition-all ${
                    mode === 'nouvelle' ? 'bg-white shadow text-[#0F6E56]' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  onClick={() => setMode('nouvelle')}
                >
                  <Building2 className="h-4 w-4" />
                  Nouvelle officine
                </button>
              </div>

              {mode === 'recherche' ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Search className="h-5 w-5" style={{ color: '#1D9E75' }} />
                      Retrouvez votre officine
                    </CardTitle>
                    <CardDescription>
                      398 officines agréées du Bénin sont pré-enregistrées au registre officiel ABMed.
                      Sélectionnez votre département puis recherchez votre officine.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!officineSelectionnee ? (
                      <>
                        <div className="space-y-2">
                          <Label>Département *</Label>
                          <Select value={departementRecherche} onValueChange={setDepartementRecherche}>
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner le département" />
                            </SelectTrigger>
                            <SelectContent>
                              {departements.map((d) => (
                                <SelectItem key={d} value={d}>
                                  {pretty(d)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="queryRecherche">Nom de l&apos;officine</Label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="queryRecherche"
                              placeholder={departementRecherche ? 'Ex. : Beyerou, Okedama, Saint Michel…' : 'Choisissez d’abord un département'}
                              value={queryRecherche}
                              onChange={(e) => setQueryRecherche(e.target.value)}
                              className="pl-9"
                              disabled={!departementRecherche}
                            />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            La recherche porte sur le nom, la commune, la zone sanitaire et le pharmacien titulaire.
                          </p>
                        </div>

                        {/* Résultats */}
                        {rechercheLoading && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                            <Loader2 className="h-4 w-4 animate-spin" /> Recherche…
                          </div>
                        )}
                        {!rechercheLoading && resultats.length > 0 && (
                          <div className="border rounded-lg divide-y max-h-72 overflow-y-auto">
                            {resultats.slice(0, 30).map((o) => (
                              <button
                                key={o.id}
                                type="button"
                                disabled={o._count.utilisateurs > 0}
                                onClick={() => setOfficineSelectionnee(o)}
                                className={`w-full text-left p-3 hover:bg-[#E1F5EE]/60 transition-colors ${
                                  o._count.utilisateurs > 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-medium text-sm truncate">{o.nom}</span>
                                  {o._count.utilisateurs > 0 ? (
                                    <Badge variant="secondary" className="text-[10px] shrink-0">Compte créé</Badge>
                                  ) : (
                                    <Badge className="text-[10px] bg-[#E1F5EE] text-[#0F6E56] border-0 shrink-0">
                                      <ShieldCheck className="h-3 w-3 mr-0.5" /> {o.numeroAbmed}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                  {[o.commune, o.zoneSanitaire && `ZS ${o.zoneSanitaire}`, o.pharmacienTitulaire]
                                    .filter(Boolean).join(' · ')}
                                </p>
                              </button>
                            ))}
                            {resultats.length > 30 && (
                              <p className="p-2 text-center text-xs text-muted-foreground">
                                {resultats.length} résultats — affichage limité à 30, affinez votre recherche
                              </p>
                            )}
                          </div>
                        )}
                        {!rechercheLoading && (departementRecherche || queryRecherche) && resultats.length === 0 && (
                          <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground">Aucune officine trouvée.</p>
                            <button
                              type="button"
                              className="text-sm font-medium mt-1 underline underline-offset-2"
                              style={{ color: '#1D9E75' }}
                              onClick={() => setMode('nouvelle')}
                            >
                              Inscrire une nouvelle officine →
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      ficheOfficine(officineSelectionnee)
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5" style={{ color: '#1D9E75' }} />
                      Nouvelle officine
                    </CardTitle>
                    <CardDescription>
                      Votre officine n&apos;est pas encore au registre ? Renseignez les mêmes informations que celles
                      demandées par l&apos;agence ABMed.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nomPharmacie">Nom / dénomination de l&apos;officine *</Label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nomPharmacie"
                          placeholder="Pharmacie …"
                          value={nomPharmacie}
                          onChange={(e) => setNomPharmacie(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Département *</Label>
                        <Select value={departement} onValueChange={setDepartement}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner" />
                          </SelectTrigger>
                          <SelectContent>
                            {departements.map((d) => (
                              <SelectItem key={d} value={d}>
                                {pretty(d)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zoneSanitaire">Zone sanitaire</Label>
                        <Input
                          id="zoneSanitaire"
                          placeholder="Ex. : Parakou - N'Dali"
                          value={zoneSanitaire}
                          onChange={(e) => setZoneSanitaire(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="commune">Commune *</Label>
                        <Input
                          id="commune"
                          placeholder="Parakou"
                          value={commune}
                          onChange={(e) => setCommune(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ville">Ville *</Label>
                        <Input
                          id="ville"
                          placeholder="Parakou"
                          value={ville}
                          onChange={(e) => setVille(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="arrondissement">Arrondissement</Label>
                      <Input
                        id="arrondissement"
                        placeholder="Ex. : 1er"
                        value={arrondissement}
                        onChange={(e) => setArrondissement(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="adresse">Localisation / adresse publiée *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="adresse"
                          placeholder="Quartier, rue, repère…"
                          value={adresse}
                          onChange={(e) => setAdresse(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                        <input
                          id="localisation"
                          className="text-sm flex-1 border-b border-dashed border-muted-foreground/40 bg-transparent py-0.5 focus:outline-none focus:border-[#1D9E75]"
                          placeholder="Précision de localisation (optionnel, même champ que l’agence)"
                          value={localisation}
                          onChange={(e) => setLocalisation(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="telephone">Contact officine *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="telephone"
                            placeholder="97 00 00 00"
                            value={telephone}
                            onChange={(e) => setTelephone(e.target.value)}
                            className="pl-9"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="emailPharmacie">Courriel officine</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="emailPharmacie"
                            type="email"
                            placeholder="contact@officine.bj"
                            value={emailPharmacie}
                            onChange={(e) => setEmailPharmacie(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Informations réglementaires (format ABMed)
                    </p>

                    <div className="space-y-2">
                      <Label htmlFor="pharmacienTitulaire">Pharmacien titulaire</Label>
                      <div className="relative">
                        <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="pharmacienTitulaire"
                          placeholder="Nom et prénom du titulaire"
                          value={pharmacienTitulaire}
                          onChange={(e) => setPharmacienTitulaire(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="pharmacienResponsable">Pharmacien responsable</Label>
                        <Input
                          id="pharmacienResponsable"
                          placeholder="Souvent le titulaire"
                          value={pharmacienResponsable}
                          onChange={(e) => setPharmacienResponsable(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactPharmacien">Contact pharmacien</Label>
                        <Input
                          id="contactPharmacien"
                          placeholder="96 00 00 00"
                          value={contactPharmacien}
                          onChange={(e) => setContactPharmacien(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="courrielPharmacien">Courriel pharmacien</Label>
                        <Input
                          id="courrielPharmacien"
                          type="email"
                          placeholder="pharmacien@…"
                          value={courrielPharmacien}
                          onChange={(e) => setCourrielPharmacien(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="numeroOnpb">N° ONPB</Label>
                        <div className="relative">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="numeroOnpb"
                            placeholder="Ex. : 480"
                            value={numeroOnpb}
                            onChange={(e) => setNumeroOnpb(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numeroAgrement">Référence autorisation d&apos;ouverture (n° d&apos;agrément) *</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="numeroAgrement"
                          placeholder="N°0006/MS/DC/SGM/CJ/ABRP/SA/…"
                          value={numeroAgrement}
                          onChange={(e) => setNumeroAgrement(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="dateValiditeAbmed">Date début validité</Label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="dateValiditeAbmed"
                            placeholder="JJ/MM/AAAA"
                            value={dateValiditeAbmed}
                            onChange={(e) => setDateValiditeAbmed(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="referenceQuitus">Référence quitus</Label>
                        <Input
                          id="referenceQuitus"
                          placeholder="ABMED/…"
                          value={referenceQuitus}
                          onChange={(e) => setReferenceQuitus(e.target.value)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" style={{ color: '#1D9E75' }} />
                    Facturation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Select value={periodeFacturation} onValueChange={setPeriodeFacturation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MENSUEL">Mensuel</SelectItem>
                      <SelectItem value="ANNUEL">Annuel (2 mois offerts)</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>

            {/* ─── Carte 2 : compte administrateur ─── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" style={{ color: '#1D9E75' }} />
                  Compte administrateur
                </CardTitle>
                <CardDescription>
                  Créez le compte du responsable de la pharmacie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input
                      id="prenom"
                      placeholder="Aminou"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      placeholder="Houénou"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@pharmacie.bj"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="motDePasse">Mot de passe *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="motDePasse"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Au moins 12 caractères"
                      value={motDePasse}
                      onChange={(e) => setMotDePasse(e.target.value)}
                      className="pl-9 pr-10"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmation">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmation"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Retapez le mot de passe"
                      value={confirmation}
                      onChange={(e) => setConfirmation(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                  {confirmation && motDePasse !== confirmation && (
                    <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <Separator className="my-2" />

                <div className="p-3 rounded-lg" style={{ background: '#E1F5EE' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4" style={{ color: '#1D9E75' }} />
                    <span className="font-medium text-sm" style={{ color: '#085041' }}>
                      Récapitulatif
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Officine</span>
                      <span className="font-medium text-right truncate max-w-[200px]" style={{ color: '#085041' }}>
                        {mode === 'recherche'
                          ? officineSelectionnee
                            ? `${officineSelectionnee.nom} ${officineSelectionnee.numeroAbmed}`
                            : '— à sélectionner —'
                          : nomPharmacie || '— à renseigner —'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <Badge variant="outline" style={{ color: '#1D9E75', borderColor: '#1D9E75' }}>
                        {planInfo.find((p) => p.id === plan)?.nom}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix</span>
                      <span className="font-semibold" style={{ color: '#085041' }}>
                        {planInfo.find((p) => p.id === plan)?.prix} FCFA
                        {plan !== 'NETWORK' && `/${periodeFacturation === 'ANNUEL' ? 'an' : 'mois'}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Essai gratuit</span>
                      <span className="text-[#1D9E75] font-medium">14 jours</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <Button
              type="submit"
              size="lg"
              className="w-full max-w-md h-12 text-base font-semibold"
              style={{ background: '#1D9E75' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Créer mon espace — Essai gratuit 14 jours
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              En créant votre compte, vous acceptez les conditions d&apos;utilisation de MediHelm.
              <br />
              Vous ne serez pas facturé pendant la période d&apos;essai.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
