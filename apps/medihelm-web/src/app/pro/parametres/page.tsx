'use client'

import { useAuth } from '@/app/pro/auth-context'
import { KpiCard } from '@/components/pro/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Settings,
  Plus,
  Search,
  Pencil,
  Trash2,
  Loader2,
  Building2,
  Users,
  Shield,
  MapPin,
  Phone,
  Mail,
  Globe,
  Save,
  UserPlus,
  CheckCircle2,
  XCircle,
  Key,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Utilisateur {
  id: string
  pharmacieId: string
  nom: string
  prenom: string
  email: string
  role: string
  telephone: string | null
  actif: boolean
  dernierLogin: string | null
  createdAt: string
}

// === Helpers ===

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const ROLES = ['OWNER', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER', 'MAGASINIER', 'COMPTABLE', 'STAGIAIRE'] as const

const ROLES_LABELS: Record<string, string> = {
  OWNER: 'Propriétaire',
  DIRECTEUR: 'Directeur',
  PHARMACIEN: 'Pharmacien',
  CAISSIER: 'Caissier',
  MAGASINIER: 'Magasinier',
  COMPTABLE: 'Comptable',
  STAGIAIRE: 'Stagiaire',
  PROMOTEUR: 'Promoteur',
  PLATFORM_ADMIN: 'Admin plateforme',
}

function getRoleBadge(role: string) {
  switch (role) {
    case 'OWNER':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">{ROLES_LABELS[role]}</Badge>
    case 'DIRECTEUR':
      return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-0 text-xs">{ROLES_LABELS[role]}</Badge>
    case 'PHARMACIEN':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">{ROLES_LABELS[role]}</Badge>
    case 'CAISSIER':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">{ROLES_LABELS[role]}</Badge>
    case 'MAGASINIER':
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-xs">{ROLES_LABELS[role]}</Badge>
    case 'COMPTABLE':
      return <Badge className="bg-teal-100 text-teal-700 hover:bg-teal-100 border-0 text-xs">{ROLES_LABELS[role]}</Badge>
    case 'STAGIAIRE':
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 text-xs">{ROLES_LABELS[role]}</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{role}</Badge>
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

// === Main Component ===

export default function ParametresPage() {
  const { pharmacie, user } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('pharmacie')

  // Pharmacie settings
  const [pharmForm, setPharmForm] = useState({
    nom: pharmacie?.nom || '',
    adresse: pharmacie?.adresse || '',
    ville: pharmacie?.ville || '',
    telephone: pharmacie?.telephone || '',
    email: pharmacie?.email || '',
    numeroAgrement: pharmacie?.numeroAgrement || '',
    latitude: '',
    longitude: '',
    siteWeb: '',
    modeGardeActif: false,
  })
  const [savingPharm, setSavingPharm] = useState(false)

  // Users
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [userSearch, setUserSearch] = useState('')

  // Dialog
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Utilisateur | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [userForm, setUserForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'PHARMACIEN',
    motDePasse: '',
  })

  // Initialize pharmacie form when data loads
  useEffect(() => {
    if (pharmacie) {
      setPharmForm(f => ({
        ...f,
        nom: pharmacie.nom || f.nom,
        adresse: pharmacie.adresse || f.adresse,
        ville: pharmacie.ville || f.ville,
        telephone: pharmacie.telephone || f.telephone,
        email: pharmacie.email || f.email,
        numeroAgrement: pharmacie.numeroAgrement || f.numeroAgrement,
      }))
    }
  }, [pharmacie])

  const fetchUsers = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId })
      const res = await fetch(`/api/utilisateurs?${params}`)
      if (res.ok) {
        const json = await res.json()
        setUtilisateurs(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      toast.error('Erreur lors du chargement des utilisateurs')
    } finally {
      setUsersLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filteredUsers = useMemo(() => {
    if (!userSearch) return utilisateurs
    const s = userSearch.toLowerCase()
    return utilisateurs.filter(u =>
      (u.nom || '').toLowerCase().includes(s) ||
      (u.prenom || '').toLowerCase().includes(s) ||
      (u.email || '').toLowerCase().includes(s)
    )
  }, [utilisateurs, userSearch])

  async function handleSavePharmacie() {
    if (!pharmacieId) return
    setSavingPharm(true)
    try {
      const body: Record<string, unknown> = {
        nom: pharmForm.nom,
        adresse: pharmForm.adresse,
        ville: pharmForm.ville,
        telephone: pharmForm.telephone,
        email: pharmForm.email,
        modeGardeActif: pharmForm.modeGardeActif,
      }
      if (pharmForm.latitude) body.latitude = parseFloat(pharmForm.latitude)
      if (pharmForm.longitude) body.longitude = parseFloat(pharmForm.longitude)
      if (pharmForm.siteWeb) body.siteWeb = pharmForm.siteWeb

      const res = await fetch(`/api/pharmacies/${pharmacieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Paramètres de la pharmacie enregistrés')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSavingPharm(false)
    }
  }

  function openAddUser() {
    setEditingUser(null)
    setUserForm({ nom: '', prenom: '', email: '', telephone: '', role: 'PHARMACIEN', motDePasse: '' })
    setUserDialogOpen(true)
  }

  function openEditUser(u: Utilisateur) {
    setEditingUser(u)
    setUserForm({
      nom: u.nom,
      prenom: u.prenom,
      email: u.email,
      telephone: u.telephone || '',
      role: u.role,
      motDePasse: '',
    })
    setUserDialogOpen(true)
  }

  async function handleSubmitUser() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        nom: userForm.nom,
        prenom: userForm.prenom,
        email: userForm.email,
        role: userForm.role,
        actif: true,
      }
      if (userForm.telephone) body.telephone = userForm.telephone
      if (!editingUser && userForm.motDePasse) body.motDePasse = userForm.motDePasse

      const url = editingUser ? `/api/utilisateurs/${editingUser.id}` : '/api/utilisateurs'
      const method = editingUser ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editingUser ? 'Utilisateur modifié' : 'Utilisateur créé')
        setUserDialogOpen(false)
        fetchUsers()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteUser() {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/utilisateurs/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Utilisateur supprimé')
        setDeleteDialogOpen(false)
        setDeletingId(null)
        fetchUsers()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  async function handleToggleActive(u: Utilisateur) {
    try {
      const res = await fetch(`/api/utilisateurs/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actif: !u.actif }),
      })
      if (res.ok) {
        toast.success(u.actif ? 'Utilisateur désactivé' : 'Utilisateur activé')
        fetchUsers()
      }
    } catch {
      toast.error('Erreur lors du changement de statut')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground text-sm">Configuration de la pharmacie et gestion des utilisateurs</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pharmacie" className="gap-2"><Building2 className="w-4 h-4" /> Pharmacie</TabsTrigger>
          <TabsTrigger value="utilisateurs" className="gap-2"><Users className="w-4 h-4" /> Utilisateurs</TabsTrigger>
        </TabsList>

        {/* Pharmacie Settings Tab */}
        <TabsContent value="pharmacie" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Informations de la pharmacie
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ph-nom">Nom de la pharmacie *</Label>
                  <Input id="ph-nom" value={pharmForm.nom} onChange={e => setPharmForm(f => ({ ...f, nom: e.target.value }))} placeholder="Pharmacie..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph-agrement">N° d&apos;agrément</Label>
                  <Input id="ph-agrement" value={pharmForm.numeroAgrement} onChange={e => setPharmForm(f => ({ ...f, numeroAgrement: e.target.value }))} disabled />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ph-adresse">Adresse *</Label>
                <Textarea id="ph-adresse" value={pharmForm.adresse} onChange={e => setPharmForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Adresse complète" rows={2} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ph-ville">Ville *</Label>
                  <Input id="ph-ville" value={pharmForm.ville} onChange={e => setPharmForm(f => ({ ...f, ville: e.target.value }))} placeholder="Ville" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph-tel">Téléphone *</Label>
                  <Input id="ph-tel" value={pharmForm.telephone} onChange={e => setPharmForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+229 90 00 00 00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph-email">Email</Label>
                  <Input id="ph-email" type="email" value={pharmForm.email} onChange={e => setPharmForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@pharmacie.com" />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ph-lat">Latitude</Label>
                  <Input id="ph-lat" type="number" step="any" value={pharmForm.latitude} onChange={e => setPharmForm(f => ({ ...f, latitude: e.target.value }))} placeholder="6.3702" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ph-lng">Longitude</Label>
                  <Input id="ph-lng" type="number" step="any" value={pharmForm.longitude} onChange={e => setPharmForm(f => ({ ...f, longitude: e.target.value }))} placeholder="2.3912" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ph-web">Site web</Label>
                <Input id="ph-web" value={pharmForm.siteWeb} onChange={e => setPharmForm(f => ({ ...f, siteWeb: e.target.value }))} placeholder="https://..." />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label htmlFor="ph-garde" className="font-medium">Mode garde actif</Label>
                  <p className="text-sm text-muted-foreground">Activer la gestion des gardes pour cette pharmacie</p>
                </div>
                <Switch id="ph-garde" checked={pharmForm.modeGardeActif} onCheckedChange={v => setPharmForm(f => ({ ...f, modeGardeActif: v }))} />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSavePharmacie} disabled={savingPharm} className="gap-2">
                  {savingPharm ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Enregistrer les modifications
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="utilisateurs" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher un utilisateur..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="pl-9" />
            </div>
            <Button onClick={openAddUser} className="gap-2">
              <UserPlus className="w-4 h-4" /> Ajouter un utilisateur
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              {usersLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : filteredUsers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun utilisateur trouvé</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nom</TableHead>
                        <TableHead>Prénom</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rôle</TableHead>
                        <TableHead>Dernier login</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.nom}</TableCell>
                          <TableCell>{u.prenom}</TableCell>
                          <TableCell className="text-sm">{u.email}</TableCell>
                          <TableCell>{getRoleBadge(u.role)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatDate(u.dernierLogin)}</TableCell>
                          <TableCell>
                            {u.actif
                              ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Actif</Badge>
                              : <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Inactif</Badge>
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditUser(u)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleActive(u)}>
                                {u.actif ? <XCircle className="w-4 h-4 text-destructive" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                              </Button>
                              {u.id !== user?.id && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingId(u.id); setDeleteDialogOpen(true) }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* User Dialog */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}</DialogTitle>
            <DialogDescription>{editingUser ? 'Modifiez les informations de l\'utilisateur' : 'Créez un nouveau compte utilisateur'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="u-nom">Nom *</Label>
                <Input id="u-nom" value={userForm.nom} onChange={e => setUserForm(f => ({ ...f, nom: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-prenom">Prénom *</Label>
                <Input id="u-prenom" value={userForm.prenom} onChange={e => setUserForm(f => ({ ...f, prenom: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="u-email">Email *</Label>
              <Input id="u-email" type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="u-tel">Téléphone</Label>
                <Input id="u-tel" value={userForm.telephone} onChange={e => setUserForm(f => ({ ...f, telephone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="u-role">Rôle *</Label>
                <Select value={userForm.role} onValueChange={v => setUserForm(f => ({ ...f, role: v }))}>
                  <SelectTrigger id="u-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => (
                      <SelectItem key={r} value={r}>{ROLES_LABELS[r]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="u-pass">Mot de passe *</Label>
                <Input id="u-pass" type="password" value={userForm.motDePasse} onChange={e => setUserForm(f => ({ ...f, motDePasse: e.target.value }))} placeholder="Minimum 8 caractères" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitUser} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingUser ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer l&apos;utilisateur</DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer cet utilisateur ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteUser}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
