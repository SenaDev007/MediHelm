'use client'

// ============================================================
// MediHelm — DPMED · Base nationale des Fiches DCI
// CRUD réservé DPMED_ADMIN (CDC Institutionnel §5)
// Champs : DCI · classe · mécanisme · indications · posologie ·
// contre-indications · interactions (JSON) · effets indésirables (JSON) ·
// conservation · source
// ============================================================

import { useEffect, useState, useCallback } from 'react'
import {
  BookOpen,
  Search,
  Plus,
  Loader2,
  Pencil,
  Trash2,
  Eye,
  AlertTriangle,
  FlaskConical,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
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
import { toast } from 'sonner'

interface Interaction {
  dci: string
  severite: string
  description: string
}

interface FicheDCI {
  id: string
  dci: string
  classeTherapeutique: string
  mecanisme: string | null
  indications: string | null
  posologie: string | null
  contreIndications: string | null
  interactions: Interaction[]
  effetsIndesirables: string[]
  conservation: string | null
  source: string
  updatedAt: string
}

const SEVERITE_STYLE: Record<string, string> = {
  'CONTRE-indication': 'bg-red-600 text-white',
  MAJEURE: 'bg-red-100 text-red-800 border-red-300',
  MODEREE: 'bg-amber-100 text-amber-800 border-amber-300',
  MINEURE: 'bg-sky-100 text-sky-800 border-sky-300',
}

const FORM_VIDE = {
  dci: '',
  classeTherapeutique: '',
  mecanisme: '',
  indications: '',
  posologie: '',
  contreIndications: '',
  interactions: '[]',
  effetsIndesirables: '[]',
  conservation: '',
  source: 'DPMED Bénin',
}

export default function FichesDCIPage() {
  const [fiches, setFiches] = useState<FicheDCI[]>([])
  const [classes, setClasses] = useState<Array<{ nom: string; nb: number }>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [recherche, setRecherche] = useState('')
  const [classeFiltre, setClasseFiltre] = useState('all')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailFiche, setDetailFiche] = useState<FicheDCI | null>(null)
  const [editFiche, setEditFiche] = useState<FicheDCI | null>(null)
  const [form, setForm] = useState(FORM_VIDE)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchFiches = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (recherche.trim()) params.set('q', recherche.trim())
      if (classeFiltre !== 'all') params.set('classe', classeFiltre)
      const res = await fetch(`/api/institutions/dpmed/fiches-dci?${params}`)
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de chargement')
        return
      }
      setFiches(json.fiches ?? [])
      setClasses(json.classes ?? [])
      setTotal(json.total ?? 0)
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setLoading(false)
    }
  }, [recherche, classeFiltre])

  useEffect(() => {
    const t = setTimeout(fetchFiches, 300)
    return () => clearTimeout(t)
  }, [fetchFiches])

  function ouvrirCreation() {
    setEditFiche(null)
    setForm(FORM_VIDE)
    setDialogOpen(true)
  }

  function ouvrirEdition(f: FicheDCI) {
    setEditFiche(f)
    setForm({
      dci: f.dci,
      classeTherapeutique: f.classeTherapeutique,
      mecanisme: f.mecanisme ?? '',
      indications: f.indications ?? '',
      posologie: f.posologie ?? '',
      contreIndications: f.contreIndications ?? '',
      interactions: JSON.stringify(f.interactions ?? [], null, 2),
      effetsIndesirables: JSON.stringify(f.effetsIndesirables ?? [], null, 2),
      conservation: f.conservation ?? '',
      source: f.source,
    })
    setDialogOpen(true)
  }

  async function soumettre() {
    if (!form.dci.trim() || !form.classeTherapeutique.trim()) {
      toast.error('DCI et classe thérapeutique sont obligatoires')
      return
    }
    // Validation JSON
    try {
      const inter = JSON.parse(form.interactions || '[]')
      const ei = JSON.parse(form.effetsIndesirables || '[]')
      if (!Array.isArray(inter) || !Array.isArray(ei)) throw new Error()
    } catch {
      toast.error('Interactions et effets indésirables doivent être des tableaux JSON valides')
      return
    }

    setSubmitting(true)
    try {
      const url = editFiche
        ? `/api/institutions/dpmed/fiches-dci/${editFiche.id}`
        : '/api/institutions/dpmed/fiches-dci'
      const res = await fetch(url, {
        method: editFiche ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur d’enregistrement')
        return
      }
      toast.success(editFiche ? `Fiche « ${form.dci} » mise à jour` : `Fiche « ${form.dci} » créée`)
      setDialogOpen(false)
      fetchFiches()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setSubmitting(false)
    }
  }

  async function supprimer(f: FicheDCI) {
    if (!confirm(`Supprimer définitivement la fiche « ${f.dci} » ?`)) return
    setDeleting(f.id)
    try {
      const res = await fetch(`/api/institutions/dpmed/fiches-dci/${f.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Erreur de suppression')
        return
      }
      toast.success(`Fiche « ${f.dci} » supprimée`)
      if (detailFiche?.id === f.id) setDetailFiche(null)
      fetchFiches()
    } catch {
      toast.error('Erreur réseau')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-teal-700" />
            Base nationale des Fiches DCI
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Référentiel officiel DPMED — interactions, posologie, contre-indications.
            CRUD réservé au rôle DPMED_ADMIN.
          </p>
        </div>
        <Button onClick={ouvrirCreation} className="bg-teal-700 hover:bg-teal-800">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle fiche DCI
        </Button>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Fiches au référentiel</p>
            <p className="text-2xl font-bold text-teal-800">{total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Classes thérapeutiques</p>
            <p className="text-2xl font-bold text-teal-800">{classes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Interactions documentées</p>
            <p className="text-2xl font-bold text-teal-800">
              {fiches.reduce((s, f) => s + (f.interactions?.length ?? 0), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Effets indésirables</p>
            <p className="text-2xl font-bold text-teal-800">
              {fiches.reduce((s, f) => s + (f.effetsIndesirables?.length ?? 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher une DCI, une indication, une classe…"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={classeFiltre} onValueChange={setClasseFiltre}>
              <SelectTrigger className="sm:w-72">
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes ({total})</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.nom} value={c.nom}>
                    {c.nom} ({c.nb})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Fiches ({fiches.length} affichées)</CardTitle>
          <CardDescription>Cliquer sur une ligne pour consulter la fiche complète</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-52" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : fiches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Aucune fiche trouvée</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajustez la recherche ou créez une nouvelle fiche DCI
              </p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>DCI</TableHead>
                    <TableHead>Classe thérapeutique</TableHead>
                    <TableHead>Interactions</TableHead>
                    <TableHead>Effets indésirables</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fiches.map((f) => (
                    <TableRow
                      key={f.id}
                      className="cursor-pointer"
                      onClick={() => setDetailFiche(f)}
                    >
                      <TableCell className="font-semibold">{f.dci}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-normal">
                          {f.classeTherapeutique}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${(f.interactions?.length ?? 0) > 0 ? 'text-red-700' : 'text-muted-foreground'}`}>
                          <AlertTriangle className="w-3 h-3" />
                          {f.interactions?.length ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {f.effetsIndesirables?.length ?? 0}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{f.source}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setDetailFiche(f)} title="Consulter">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => ouvrirEdition(f)} title="Modifier">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => supprimer(f)}
                            disabled={deleting === f.id}
                            title="Supprimer"
                          >
                            {deleting === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-red-600" />}
                          </Button>
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

      {/* ── Détail fiche ── */}
      <Dialog open={!!detailFiche} onOpenChange={(o) => !o && setDetailFiche(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailFiche && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <FlaskConical className="w-5 h-5 text-teal-700" />
                  {detailFiche.dci}
                </DialogTitle>
                <DialogDescription>
                  <Badge variant="outline">{detailFiche.classeTherapeutique}</Badge>
                  <span className="ml-2 text-xs">Source : {detailFiche.source}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <Section titre="Mécanisme d'action" texte={detailFiche.mecanisme} />
                <Section titre="Indications" texte={detailFiche.indications} />
                <Section titre="Posologie" texte={detailFiche.posologie} />
                <Section titre="Contre-indications" texte={detailFiche.contreIndications} warning />
                {detailFiche.interactions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 text-red-800 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" /> Interactions médicamenteuses
                    </h4>
                    <div className="space-y-2">
                      {detailFiche.interactions.map((it, i) => (
                        <div key={i} className="rounded-lg border p-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{it.dci}</span>
                            <Badge className={SEVERITE_STYLE[it.severite] ?? ''}>{it.severite}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{it.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {detailFiche.effetsIndesirables?.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Effets indésirables</h4>
                    <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                      {detailFiche.effetsIndesirables.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Section titre="Conservation" texte={detailFiche.conservation} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog création/édition ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editFiche ? `Modifier — ${editFiche.dci}` : 'Nouvelle fiche DCI'}</DialogTitle>
            <DialogDescription>
              Référentiel national — les champs alimentent les contrôles d’interactions MediHelm
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>DCI *</Label>
                <Input value={form.dci} onChange={(e) => setForm((f) => ({ ...f, dci: e.target.value }))} placeholder="ex. Paracétamol" />
              </div>
              <div className="space-y-2">
                <Label>Classe thérapeutique *</Label>
                <Input value={form.classeTherapeutique} onChange={(e) => setForm((f) => ({ ...f, classeTherapeutique: e.target.value }))} placeholder="ex. Antalgiques-antipyrétiques" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Mécanisme d&apos;action</Label>
              <Textarea rows={2} value={form.mecanisme} onChange={(e) => setForm((f) => ({ ...f, mecanisme: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Indications</Label>
              <Textarea rows={2} value={form.indications} onChange={(e) => setForm((f) => ({ ...f, indications: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Posologie</Label>
              <Textarea rows={3} value={form.posologie} onChange={(e) => setForm((f) => ({ ...f, posologie: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Contre-indications</Label>
              <Textarea rows={2} value={form.contreIndications} onChange={(e) => setForm((f) => ({ ...f, contreIndications: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Interactions (JSON)</Label>
                <Textarea
                  rows={5}
                  className="font-mono text-xs"
                  value={form.interactions}
                  onChange={(e) => setForm((f) => ({ ...f, interactions: e.target.value }))}
                  placeholder={`[{"dci":"Warfarine","severite":"MAJEURE","description":"..."}]`}
                />
              </div>
              <div className="space-y-2">
                <Label>Effets indésirables (JSON)</Label>
                <Textarea
                  rows={5}
                  className="font-mono text-xs"
                  value={form.effetsIndesirables}
                  onChange={(e) => setForm((f) => ({ ...f, effetsIndesirables: e.target.value }))}
                  placeholder={`["Céphalées","Nausées"]`}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Conservation</Label>
                <Input value={form.conservation} onChange={(e) => setForm((f) => ({ ...f, conservation: e.target.value }))} placeholder="ex. ≤ 30 °C au sec" />
              </div>
              <div className="space-y-2">
                <Label>Source</Label>
                <Input value={form.source} onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={soumettre} disabled={submitting} className="bg-teal-700 hover:bg-teal-800">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editFiche ? 'Enregistrer les modifications' : 'Créer la fiche'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Section({ titre, texte, warning }: { titre: string; texte: string | null; warning?: boolean }) {
  if (!texte) return null
  return (
    <div>
      <h4 className={`font-semibold mb-1 ${warning ? 'text-red-800' : ''}`}>{titre}</h4>
      <p className={`rounded-lg p-3 ${warning ? 'bg-red-50 border border-red-200' : 'bg-muted'}`}>{texte}</p>
    </div>
  )
}
