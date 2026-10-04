'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Textarea,
} from '@/components/ui/textarea'
import {
  AlertTriangle,
  Plus,
  ChevronLeft,
  ChevronRight,
  Shield,
  Eye,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface AlerteDPMED {
  id: string
  referenceOfficielle: string
  titre: string
  typeAlerte: string
  niveauUrgence: string
  dciConcernee: string | null
  description: string | null
  statut: string
  dateEmissionDPMED: string
  totalDiffusions: number
  diffusionsAcquittees: number
  diffusionsEnAttente: number
  createdAt: string
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const NIVEAUX_URGENCE: Record<string, { color: string; bg: string }> = {
  CRITIQUE: { color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/30' },
  URGENT: { color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  IMPORTANT: { color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  NORMAL: { color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30' },
}

export default function AlertesDPMEDPage() {
  const [alertes, setAlertes] = useState<AlerteDPMED[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialog, setCreateDialog] = useState(false)
  const [viewDialog, setViewDialog] = useState<AlerteDPMED | null>(null)
  const [creating, setCreating] = useState(false)

  // Create form
  const [formRef, setFormRef] = useState('')
  const [formTitre, setFormTitre] = useState('')
  const [formType, setFormType] = useState('RAPPEL_LOT')
  const [formNiveau, setFormNiveau] = useState('URGENT')
  const [formDci, setFormDci] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formDate, setFormDate] = useState('')

  const fetchAlertes = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/alertes-dpmed')
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      setAlertes(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAlertes()
  }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/admin/alertes-dpmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceOfficielle: formRef,
          titre: formTitre,
          typeAlerte: formType,
          niveauUrgence: formNiveau,
          dciConcernee: formDci || null,
          description: formDesc || null,
          dateEmissionDPMED: formDate || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      toast.success(data.message)
      setCreateDialog(false)
      resetForm()
      fetchAlertes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setFormRef('')
    setFormTitre('')
    setFormType('RAPPEL_LOT')
    setFormNiveau('URGENT')
    setFormDci('')
    setFormDesc('')
    setFormDate('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-destructive" /> Alertes DPMED
          </h1>
          <p className="text-sm text-muted-foreground">Gestion des alertes de la Direction de la Pharmacie et du Médicament</p>
        </div>
        <Button onClick={() => setCreateDialog(true)} className="bg-teal-600 hover:bg-teal-700">
          <Plus className="w-4 h-4 mr-2" /> Nouvelle alerte
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total</span>
            <p className="text-2xl font-bold">{alertes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">En diffusion</span>
            <p className="text-2xl font-bold text-amber-500">{alertes.filter(a => a.statut === 'EN_DIFFUSION').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Clôturées</span>
            <p className="text-2xl font-bold text-green-600">{alertes.filter(a => a.statut === 'CLOTUREE').length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diffusions en attente</span>
            <p className="text-2xl font-bold text-destructive">{alertes.reduce((sum, a) => sum + a.diffusionsEnAttente, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Référence</TableHead>
                    <TableHead>Titre</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Urgence</TableHead>
                    <TableHead>DCI</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Diffusions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucune alerte DPMED
                      </TableCell>
                    </TableRow>
                  ) : (
                    alertes.map(a => {
                      const niveau = NIVEAUX_URGENCE[a.niveauUrgence] || NIVEAUX_URGENCE.NORMAL
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs font-mono">{a.referenceOfficielle}</TableCell>
                          <TableCell className="font-medium max-w-48 truncate">{a.titre}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{a.typeAlerte}</Badge></TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded ${niveau.color} ${niveau.bg}`}>
                              {a.niveauUrgence}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{a.dciConcernee || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={a.statut === 'EN_DIFFUSION' ? 'destructive' : a.statut === 'CLOTUREE' ? 'secondary' : 'outline'} className="text-[10px]">
                              {a.statut}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col text-xs">
                              <span>{a.diffusionsAcquittees}/{a.totalDiffusions} acquittées</span>
                              {a.diffusionsEnAttente > 0 && (
                                <span className="text-destructive">{a.diffusionsEnAttente} en attente</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => setViewDialog(a)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle alerte DPMED</DialogTitle>
            <DialogDescription>Créer une alerte qui sera diffusée à toutes les pharmacies actives.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Référence officielle *</label>
                <Input value={formRef} onChange={e => setFormRef(e.target.value)} placeholder="REF-2025-001" />
              </div>
              <div>
                <label className="text-xs font-medium">Date d&apos;émission</label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Titre *</label>
              <Input value={formTitre} onChange={e => setFormTitre(e.target.value)} placeholder="Rappel de lot - Médicament X" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Type d&apos;alerte</label>
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RAPPEL_LOT">Rappel de lot</SelectItem>
                    <SelectItem value="RETRAIT_MARCHE">Retrait du marché</SelectItem>
                    <SelectItem value="INFO_SECURITE">Info sécurité</SelectItem>
                    <SelectItem value="INTERDICTION">Interdiction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium">Niveau d&apos;urgence</label>
                <Select value={formNiveau} onValueChange={setFormNiveau}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRITIQUE">Critique</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="IMPORTANT">Important</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">DCI concernée</label>
              <Input value={formDci} onChange={e => setFormDci(e.target.value)} placeholder="Paracétamol, Amoxicilline..." />
            </div>
            <div>
              <label className="text-xs font-medium">Description</label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Détails de l'alerte..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialog(false)}>Annuler</Button>
            <Button disabled={creating || !formRef || !formTitre} onClick={handleCreate} className="bg-teal-600 hover:bg-teal-700">
              {creating ? 'Création...' : 'Créer et diffuser'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewDialog} onOpenChange={() => setViewDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{viewDialog?.titre}</DialogTitle>
            <DialogDescription>{viewDialog?.referenceOfficielle}</DialogDescription>
          </DialogHeader>
          {viewDialog && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Type</span>
                  <p><Badge variant="outline" className="text-[10px]">{viewDialog.typeAlerte}</Badge></p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Urgence</span>
                  <p><Badge variant={viewDialog.niveauUrgence === 'CRITIQUE' ? 'destructive' : 'outline'} className="text-[10px]">{viewDialog.niveauUrgence}</Badge></p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">DCI</span>
                  <p className="text-sm">{viewDialog.dciConcernee || '-'}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Statut</span>
                  <p><Badge variant={viewDialog.statut === 'EN_DIFFUSION' ? 'destructive' : 'secondary'} className="text-[10px]">{viewDialog.statut}</Badge></p>
                </div>
              </div>
              {viewDialog.description && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Description</span>
                  <p className="text-sm mt-1">{viewDialog.description}</p>
                </div>
              )}
              <div>
                <span className="text-xs font-medium text-muted-foreground">Diffusions</span>
                <div className="flex gap-4 mt-1">
                  <span className="text-sm">{viewDialog.totalDiffusions} total</span>
                  <span className="text-sm text-green-600">{viewDialog.diffusionsAcquittees} acquittées</span>
                  <span className="text-sm text-destructive">{viewDialog.diffusionsEnAttente} en attente</span>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Date d&apos;émission DPMED</span>
                <p className="text-sm">{formatDate(viewDialog.dateEmissionDPMED)}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
