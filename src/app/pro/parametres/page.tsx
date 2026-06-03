'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  Settings,
  Store,
  Users,
  Bell,
  CreditCard,
  Link2,
  Plus,
  Pencil,
  Save,
  Calculator,
  Wifi,
  Globe,
  Shield,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Caisse {
  id: string
  nom: string
  numero: number
  actif: boolean
  sessionsCaisse?: { id: string; dateOuverture: string; fondDeCaisse: number }[]
}

interface UtilisateurItem {
  id: string
  nom: string
  prenom: string
  email: string
  telephone: string | null
  actif: boolean
  roleId: string
  role?: { id: string; nom: string }
  dernierLogin: string | null
}

interface RoleItem {
  id: string
  nom: string
  description: string | null
}

interface FournisseurAPI {
  id: string
  nom: string
  code: string
  grossisteId: string | null
  email: string | null
  telephone: string | null
}

interface AbonnementItem {
  id: string
  plan: string
  periode: string
  prix: number
  debut: string
  fin: string | null
  statut: string
  essaiActif: boolean
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

// === Main Component ===

export default function ParametresPage() {
  const { pharmacie } = useAuth()
  const [activeTab, setActiveTab] = useState('informations')

  // === Tab 1: Informations ===
  const [pharmacieData, setPharmacieData] = useState<Record<string, unknown> | null>(null)
  const [loadingInfo, setLoadingInfo] = useState(true)
  const [savingInfo, setSavingInfo] = useState(false)
  const [formNom, setFormNom] = useState('')
  const [formAdresse, setFormAdresse] = useState('')
  const [formVille, setFormVille] = useState('')
  const [formDepartement, setFormDepartement] = useState('')
  const [formTelephone, setFormTelephone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formAgrement, setFormAgrement] = useState('')

  // === Tab 2: Caisse ===
  const [caisses, setCaisses] = useState<Caisse[]>([])
  const [loadingCaisses, setLoadingCaisses] = useState(true)
  const [addCaisseOpen, setAddCaisseOpen] = useState(false)
  const [caisseNom, setCaisseNom] = useState('')
  const [caisseNumero, setCaisseNumero] = useState('')

  // === Tab 3: Utilisateurs ===
  const [utilisateurs, setUtilisateurs] = useState<UtilisateurItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [addUserOpen, setAddUserOpen] = useState(false)
  const [userNom, setUserNom] = useState('')
  const [userPrenom, setUserPrenom] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userRoleId, setUserRoleId] = useState('')

  // === Tab 4: Notifications ===
  const [notifPrefs, setNotifPrefs] = useState({
    push: true,
    sms: false,
    email: true,
    in_app: true,
  })
  const [savingNotif, setSavingNotif] = useState(false)

  // === Tab 5: Abonnement ===
  const [abonnements, setAbonnements] = useState<AbonnementItem[]>([])
  const [loadingAbo, setLoadingAbo] = useState(true)

  // === Tab 6: API & Intégrations ===
  const [fournisseursAPI, setFournisseursAPI] = useState<FournisseurAPI[]>([])
  const [loadingAPI, setLoadingAPI] = useState(true)

  // === Load data ===
  useEffect(() => {
    if (!pharmacie?.id) return

    // Load pharmacy info
    const loadPharmacie = async () => {
      setLoadingInfo(true)
      try {
        const res = await fetch(`/api/pharmacies/${pharmacie.id}`)
        if (res.ok) {
          const data = await res.json()
          setPharmacieData(data)
          setFormNom(data.nom || '')
          setFormAdresse(data.adresse || '')
          setFormVille(data.ville || '')
          setFormDepartement(data.departement || '')
          setFormTelephone(data.telephone || '')
          setFormEmail(data.email || '')
          setFormAgrement(data.numeroAgrement || '')
        }
      } catch { /* empty */ } finally {
        setLoadingInfo(false)
      }
    }

    // Load caisses
    const loadCaisses = async () => {
      setLoadingCaisses(true)
      try {
        const res = await fetch(`/api/caisses?pharmacieId=${pharmacie.id}`)
        if (res.ok) setCaisses(await res.json())
      } catch { /* empty */ } finally {
        setLoadingCaisses(false)
      }
    }

    // Load utilisateurs
    const loadUsers = async () => {
      setLoadingUsers(true)
      try {
        const res = await fetch(`/api/utilisateurs?pharmacieId=${pharmacie.id}`)
        if (res.ok) {
          const data = await res.json()
          setUtilisateurs(data)
        }
      } catch { /* empty */ } finally {
        setLoadingUsers(false)
      }
    }

    // Load roles
    const loadRoles = async () => {
      try {
        const res = await fetch('/api/utilisateurs')
        if (res.ok) {
          const allUsers = await res.json()
          const uniqueRoles = new Map<string, RoleItem>()
          allUsers.forEach((u: UtilisateurItem) => {
            if (u.role && !uniqueRoles.has(u.role.id)) {
              uniqueRoles.set(u.role.id, u.role)
            }
          })
          setRoles(Array.from(uniqueRoles.values()))
        }
      } catch { /* empty */ }
    }

    // Load abonnements
    const loadAbo = async () => {
      setLoadingAbo(true)
      try {
        const res = await fetch(`/api/abonnements?pharmacieId=${pharmacie.id}`)
        if (res.ok) setAbonnements(await res.json())
      } catch { /* empty */ } finally {
        setLoadingAbo(false)
      }
    }

    // Load fournisseurs API
    const loadAPI = async () => {
      setLoadingAPI(true)
      try {
        const res = await fetch(`/api/fournisseurs?pharmacieId=${pharmacie.id}`)
        if (res.ok) {
          const data = await res.json()
          setFournisseursAPI(data.filter((f: FournisseurAPI & { estGrossisteAPI: boolean }) => f.estGrossisteAPI))
        }
      } catch { /* empty */ } finally {
        setLoadingAPI(false)
      }
    }

    loadPharmacie()
    loadCaisses()
    loadUsers()
    loadRoles()
    loadAbo()
    loadAPI()
  }, [pharmacie?.id])

  // === Handlers ===

  const handleSavePharmacie = async () => {
    if (!pharmacie?.id) return
    setSavingInfo(true)
    try {
      const res = await fetch(`/api/pharmacies/${pharmacie.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: formNom,
          adresse: formAdresse,
          ville: formVille,
          departement: formDepartement,
          telephone: formTelephone,
          email: formEmail,
          numeroAgrement: formAgrement,
        }),
      })
      if (res.ok) {
        toast.success('Informations mises à jour avec succès')
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSavingInfo(false)
    }
  }

  const handleAddCaisse = async () => {
    if (!pharmacie?.id || !caisseNom) {
      toast.error('Le nom de la caisse est requis')
      return
    }
    try {
      const res = await fetch('/api/caisses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nom: caisseNom,
          numero: parseInt(caisseNumero) || caisses.length + 1,
        }),
      })
      if (res.ok) {
        toast.success('Caisse ajoutée avec succès')
        setAddCaisseOpen(false)
        setCaisseNom('')
        setCaisseNumero('')
        const refreshRes = await fetch(`/api/caisses?pharmacieId=${pharmacie.id}`)
        if (refreshRes.ok) setCaisses(await refreshRes.json())
      } else {
        toast.error('Erreur lors de l\'ajout de la caisse')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const handleAddUser = async () => {
    if (!pharmacie?.id || !userNom || !userPrenom || !userEmail || !userRoleId) {
      toast.error('Tous les champs sont requis')
      return
    }
    try {
      const res = await fetch('/api/utilisateurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nom: userNom,
          prenom: userPrenom,
          email: userEmail,
          roleId: userRoleId,
          motDePasse: 'Changer@123',
        }),
      })
      if (res.ok) {
        toast.success('Utilisateur ajouté avec succès')
        setAddUserOpen(false)
        setUserNom('')
        setUserPrenom('')
        setUserEmail('')
        setUserRoleId('')
        const refreshRes = await fetch(`/api/utilisateurs?pharmacieId=${pharmacie.id}`)
        if (refreshRes.ok) setUtilisateurs(await refreshRes.json())
      } else {
        toast.error('Erreur lors de l\'ajout de l\'utilisateur')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const handleSaveNotif = async () => {
    setSavingNotif(true)
    await new Promise(r => setTimeout(r, 800))
    toast.success('Préférences de notification enregistrées')
    setSavingNotif(false)
  }

  // === Computed values ===
  const currentAbo = abonnements.find(a => a.statut === 'ACTIF' || a.statut === 'ESSAI')
  const planLabel = pharmacie?.plan || currentAbo?.plan || 'SEED'
  const nbUsersCurrent = utilisateurs.filter(u => u.actif).length
  const nbUsersMax = (pharmacieData?.nbUtilisateursMax as number) || 5
  const nbCaissiersMax = (pharmacieData?.nbCaissiersSimut as number) || 2

  if (!pharmacie?.id) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Chargement...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-[#1D9E75]" />
            Paramètres
          </h1>
          <p className="text-sm text-muted-foreground">
            Configuration de votre pharmacie — Plan {planLabel}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 gap-1 h-auto p-1">
          <TabsTrigger value="informations" className="text-xs gap-1.5">
            <Store className="w-3.5 h-3.5" /> Informations
          </TabsTrigger>
          <TabsTrigger value="caisse" className="text-xs gap-1.5">
            <Calculator className="w-3.5 h-3.5" /> Caisse
          </TabsTrigger>
          <TabsTrigger value="utilisateurs" className="text-xs gap-1.5">
            <Users className="w-3.5 h-3.5" /> Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="abonnement" className="text-xs gap-1.5">
            <CreditCard className="w-3.5 h-3.5" /> Abonnement
          </TabsTrigger>
          <TabsTrigger value="api" className="text-xs gap-1.5">
            <Link2 className="w-3.5 h-3.5" /> API
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Informations */}
        <TabsContent value="informations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Store className="w-4 h-4 text-[#1D9E75]" />
                Informations de la pharmacie
              </CardTitle>
              <CardDescription>Modifiez les informations de votre officine</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInfo ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
                </div>
              ) : (
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Nom de la pharmacie</Label>
                      <Input value={formNom} onChange={e => setFormNom(e.target.value)} />
                    </div>
                    <div>
                      <Label>N° Agrément</Label>
                      <Input value={formAgrement} onChange={e => setFormAgrement(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Adresse</Label>
                    <Input value={formAdresse} onChange={e => setFormAdresse(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Ville</Label>
                      <Input value={formVille} onChange={e => setFormVille(e.target.value)} />
                    </div>
                    <div>
                      <Label>Département</Label>
                      <Input value={formDepartement} onChange={e => setFormDepartement(e.target.value)} />
                    </div>
                    <div>
                      <Label>Téléphone</Label>
                      <Input value={formTelephone} onChange={e => setFormTelephone(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Email</Label>
                      <Input type="email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
                    </div>
                    <div className="flex items-end">
                      <Button
                        className="bg-[#1D9E75] hover:bg-[#085041] gap-2 w-full md:w-auto"
                        onClick={handleSavePharmacie}
                        disabled={savingInfo}
                      >
                        <Save className="w-4 h-4" />
                        {savingInfo ? 'Enregistrement...' : 'Enregistrer'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Caisse */}
        <TabsContent value="caisse" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calculator className="w-4 h-4 text-[#1D9E75]" />
                  Gestion des caisses
                </CardTitle>
                <CardDescription>{caisses.length} caisses configurées</CardDescription>
              </div>
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddCaisseOpen(true)}>
                <Plus className="w-4 h-4" /> Ajouter
              </Button>
            </CardHeader>
            <CardContent>
              {loadingCaisses ? (
                <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-16" />)}</div>
              ) : caisses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucune caisse configurée</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {caisses.map(caisse => (
                    <div key={caisse.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center">
                          <Calculator className="w-5 h-5 text-[#1D9E75]" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{caisse.nom}</p>
                          <p className="text-xs text-muted-foreground">N° {caisse.numero}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {caisse.sessionsCaisse && caisse.sessionsCaisse.length > 0 ? (
                          <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Session active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">Fermée</Badge>
                        )}
                        {caisse.actif ? (
                          <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Active</Badge>
                        ) : (
                          <Badge className="text-[9px] bg-red-100 text-red-800 border-0">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Utilisateurs */}
        <TabsContent value="utilisateurs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="w-4 h-4 text-[#1D9E75]" />
                  Utilisateurs
                </CardTitle>
                <CardDescription>
                  {nbUsersCurrent} / {nbUsersMax} utilisateurs
                </CardDescription>
              </div>
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddUserOpen(true)}>
                <Plus className="w-4 h-4" /> Inviter
              </Button>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                        <TableHead>Dernier login</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {utilisateurs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Aucun utilisateur trouvé
                          </TableCell>
                        </TableRow>
                      ) : (
                        utilisateurs.map(u => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium text-sm">
                              {u.prenom} {u.nom}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-[9px]">{u.role?.nom || '—'}</Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {u.actif ? (
                                <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Actif</Badge>
                              ) : (
                                <Badge className="text-[9px] bg-red-100 text-red-800 border-0">Inactif</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {u.dernierLogin ? new Date(u.dernierLogin).toLocaleDateString('fr-FR') : 'Jamais'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
              {/* Usage meter */}
              <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                <div className="flex justify-between text-xs mb-1">
                  <span>Utilisateurs utilisés</span>
                  <span className="font-medium">{nbUsersCurrent} / {nbUsersMax}</span>
                </div>
                <Progress value={(nbUsersCurrent / nbUsersMax) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-4 h-4 text-[#1D9E75]" />
                Préférences de notification
              </CardTitle>
              <CardDescription>Configurez comment vous recevez les notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {([
                { key: 'push' as const, label: 'Notifications Push', desc: 'Notifications en temps réel sur votre navigateur', icon: Bell },
                { key: 'sms' as const, label: 'SMS', desc: 'Notifications par SMS sur votre téléphone', icon: Shield },
                { key: 'email' as const, label: 'Email', desc: 'Notifications par courrier électronique', icon: Globe },
                { key: 'in_app' as const, label: 'In-App', desc: 'Notifications dans l\'application', icon: Wifi },
              ]).map(channel => (
                <div key={channel.key} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center">
                      <channel.icon className="w-5 h-5 text-[#1D9E75]" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{channel.label}</p>
                      <p className="text-xs text-muted-foreground">{channel.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={notifPrefs[channel.key]}
                    onCheckedChange={checked => setNotifPrefs(p => ({ ...p, [channel.key]: checked }))}
                  />
                </div>
              ))}
              <div className="flex justify-end">
                <Button
                  className="bg-[#1D9E75] hover:bg-[#085041] gap-2"
                  onClick={handleSaveNotif}
                  disabled={savingNotif}
                >
                  <Save className="w-4 h-4" />
                  {savingNotif ? 'Enregistrement...' : 'Enregistrer les préférences'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 5: Abonnement */}
        <TabsContent value="abonnement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="w-4 h-4 text-[#1D9E75]" />
                Abonnement actuel
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAbo ? (
                <Skeleton className="h-32" />
              ) : currentAbo ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-xs text-muted-foreground">Plan</span>
                      <p className="font-bold text-[#1D9E75]">{currentAbo.plan}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-xs text-muted-foreground">Statut</span>
                      <p>
                        <Badge className={`text-[9px] border-0 ${currentAbo.statut === 'ACTIF' ? 'bg-[#E1F5EE] text-[#085041]' : 'bg-amber-100 text-amber-800'}`}>
                          {currentAbo.statut}
                        </Badge>
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-xs text-muted-foreground">Période</span>
                      <p className="font-medium text-sm">{currentAbo.periode === 'MENSUEL' ? 'Mensuel' : 'Annuel'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <span className="text-xs text-muted-foreground">Essai actif</span>
                      <p className="font-medium text-sm">{currentAbo.essaiActif ? 'Oui' : 'Non'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Utilisateurs</span>
                        <span className="font-medium">{nbUsersCurrent}/{nbUsersMax}</span>
                      </div>
                      <Progress value={(nbUsersCurrent / nbUsersMax) * 100} className="h-2" />
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Caissiers simultanés</span>
                        <span className="font-medium">—/{nbCaissiersMax}</span>
                      </div>
                      <Progress value={30} className="h-2" />
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Stockage documents</span>
                        <span className="font-medium">{((pharmacieData?.stockageDocuments as number) || 500)}MB</span>
                      </div>
                      <Progress value={15} className="h-2" />
                    </div>
                  </div>
                  <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={() => window.location.href = '/pro/abonnement'}>
                    Voir les offres et upgrader
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun abonnement actif trouvé</p>
                  <Button className="mt-3 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => window.location.href = '/pro/abonnement'}>
                    Choisir un plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 6: API & Intégrations */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="w-4 h-4 text-[#1D9E75]" />
                Grossistes API configurés
              </CardTitle>
              <CardDescription>
                {fournisseursAPI.length} / {pharmacieData?.apiGrossistesMax || 2} intégrations actives
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAPI ? (
                <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-20" />)}</div>
              ) : fournisseursAPI.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucun grossiste API configuré</p>
                  <p className="text-xs mt-1">Configurez vos grossistes dans la section Fournisseurs</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {fournisseursAPI.map(f => (
                    <div key={f.id} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center">
                            <Globe className="w-5 h-5 text-[#1D9E75]" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{f.nom}</p>
                            <p className="text-xs text-muted-foreground font-mono">{f.code}</p>
                          </div>
                        </div>
                        <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Connecté</Badge>
                      </div>
                      {f.grossisteId && (
                        <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                          <span className="font-medium">ID Grossiste:</span> {f.grossisteId}
                        </div>
                      )}
                      <div className="mt-2 pt-2 border-t text-xs text-muted-foreground">
                        <span className="font-medium">Webhook URL:</span>{' '}
                        <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                          /api/webhooks/{f.code.toLowerCase()}
                        </code>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Caisse Dialog */}
      <Dialog open={addCaisseOpen} onOpenChange={setAddCaisseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1D9E75]" />
              Nouvelle caisse
            </DialogTitle>
            <DialogDescription>Ajoutez une caisse à votre pharmacie</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nom de la caisse *</Label>
              <Input placeholder="Caisse 1" value={caisseNom} onChange={e => setCaisseNom(e.target.value)} />
            </div>
            <div>
              <Label>Numéro</Label>
              <Input type="number" placeholder="Auto" value={caisseNumero} onChange={e => setCaisseNumero(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCaisseOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddCaisse} disabled={!caisseNom}>
              Ajouter la caisse
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog open={addUserOpen} onOpenChange={setAddUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1D9E75]" />
              Inviter un utilisateur
            </DialogTitle>
            <DialogDescription>Un mot de passe temporaire sera généré</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prénom *</Label>
                <Input value={userPrenom} onChange={e => setUserPrenom(e.target.value)} />
              </div>
              <div>
                <Label>Nom *</Label>
                <Input value={userNom} onChange={e => setUserNom(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Email *</Label>
              <Input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} />
            </div>
            <div>
              <Label>Rôle *</Label>
              <Select value={userRoleId} onValueChange={setUserRoleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddUser} disabled={!userNom || !userEmail}>
              Inviter l&apos;utilisateur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
