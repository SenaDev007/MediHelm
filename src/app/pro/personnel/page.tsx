'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { UserCog, Plus, Search, Phone, Mail, Calendar } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

interface Employe {
  id: string
  nom: string
  prenom: string
  poste: string
  typeContrat: string
  dateEmbauche: string
  dateFinContrat: string | null
  salaireBase: number | null
  telephone: string | null
  email: string | null
  actif: boolean
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

const contratLabels: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  TEMPORAIRE: 'Temporaire',
}

export default function PersonnelPage() {
  const { pharmacie } = useAuth()
  const [employes, setEmployes] = useState<Employe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [formNom, setFormNom] = useState('')
  const [formPrenom, setFormPrenom] = useState('')
  const [formPoste, setFormPoste] = useState('')
  const [formTelephone, setFormTelephone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTypeContrat, setFormTypeContrat] = useState('')

  const handleAddEmployee = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/employes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nom: formNom,
          prenom: formPrenom,
          poste: formPoste,
          telephone: formTelephone || null,
          email: formEmail || null,
          typeContrat: formTypeContrat || 'CDD',
          dateEmbauche: new Date().toISOString(),
          actif: true,
        }),
      })
      if (res.ok) {
        toast.success('Employé ajouté avec succès')
        setCreateOpen(false)
        setFormNom('')
        setFormPrenom('')
        setFormPoste('')
        setFormTelephone('')
        setFormEmail('')
        setFormTypeContrat('')
        // Refresh
        const data = await fetch(`/api/employes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : [])
        setEmployes(data)
      } else {
        toast.error("Erreur lors de l'ajout de l'employé")
      }
    } catch {
      toast.error("Erreur lors de l'ajout de l'employé")
    }
  }

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      fetch(`/api/employes?pharmacieId=${pharmacie.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setEmployes(data))
        .catch(() => setEmployes([]))
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const filtered = useMemo(() => {
    if (!search) return employes
    const q = search.toLowerCase()
    return employes.filter(e =>
      e.nom.toLowerCase().includes(q) ||
      e.prenom.toLowerCase().includes(q) ||
      e.poste.toLowerCase().includes(q)
    )
  }, [employes, search])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" />
            Personnel
          </h1>
          <p className="text-sm text-muted-foreground">{employes.length} employés • {employes.filter(e => e.actif).length} actifs</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nouvel employé</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nom</Label><Input placeholder="Nom" value={formNom} onChange={e => setFormNom(e.target.value)} /></div>
                <div><Label>Prénom</Label><Input placeholder="Prénom" value={formPrenom} onChange={e => setFormPrenom(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Poste</Label><Input placeholder="Pharmacien, Préparateur..." value={formPoste} onChange={e => setFormPoste(e.target.value)} /></div>
                <div>
                  <Label>Type de contrat</Label>
                  <Select value={formTypeContrat} onValueChange={setFormTypeContrat}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="STAGE">Stage</SelectItem>
                      <SelectItem value="TEMPORAIRE">Temporaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Téléphone</Label><Input placeholder="+229..." value={formTelephone} onChange={e => setFormTelephone(e.target.value)} /></div>
                <div><Label>Email</Label><Input placeholder="email@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} /></div>
              </div>
              <Button className="w-full" onClick={handleAddEmployee}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher un employé..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.length === 0 ? (
          <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Aucun employé trouvé</CardContent></Card>
        ) : (
          filtered.map(emp => (
            <Card key={emp.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                    {emp.prenom[0]}{emp.nom[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{emp.prenom} {emp.nom}</span>
                      {!emp.actif && <Badge variant="outline" className="text-[9px]">Inactif</Badge>}
                    </div>
                    <span className="text-xs text-muted-foreground block">{emp.poste}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px]">{contratLabels[emp.typeContrat] || emp.typeContrat}</Badge>
                      {emp.salaireBase && <span className="text-xs text-muted-foreground">{formatFCFA(emp.salaireBase)}</span>}
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1.5">
                      {emp.telephone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{emp.telephone}</span>}
                      {emp.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Embauche: {formatDate(emp.dateEmbauche)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
