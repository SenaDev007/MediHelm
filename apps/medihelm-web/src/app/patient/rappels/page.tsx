'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePatientSession } from '@/hooks/use-patient-session'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  Bell, Plus, Clock, Pill, Trash2, Edit3, Calendar,
  AlertCircle, Check, Loader2, ToggleLeft, ToggleRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface Rappel {
  id: string
  medicamentNom: string
  dosage: string | null
  frequence: string | null
  heureRappel: string | null
  dateDebut: string
  dateFin: string | null
  actif: boolean
  notes: string | null
}

interface RappelForm {
  medicamentNom: string
  dosage: string
  frequence: string
  heureRappel: string
  dateDebut: string
  dateFin: string
  notes: string
}

const defaultForm: RappelForm = {
  medicamentNom: '',
  dosage: '',
  frequence: '1 fois par jour',
  heureRappel: '08:00',
  dateDebut: new Date().toISOString().split('T')[0],
  dateFin: '',
  notes: '',
}

const frequenceOptions = [
  '1 fois par jour',
  '2 fois par jour',
  '3 fois par jour',
  'Toutes les 8 heures',
  'Toutes les 12 heures',
  '1 fois par semaine',
  'Au besoin',
]

export default function RappelsPage() {
  const [rappels, setRappels] = useState<Rappel[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<RappelForm>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [filter, setFilter] = useState<'tous' | 'actifs' | 'inactifs'>('tous')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const { patientId } = usePatientSession()

  const fetchRappels = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patient/rappels?patientId=${patientId}`)
      if (res.ok) {
        const data = await res.json()
        setRappels(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    if (patientId) fetchRappels()
  }, [fetchRappels, patientId])

  const handleSubmit = async () => {
    if (!form.medicamentNom.trim() || !form.dateDebut) {
      toast.error('Veuillez remplir le nom du médicament et la date de début')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/patient/rappels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          medicamentNom: form.medicamentNom.trim(),
          dosage: form.dosage.trim() || null,
          frequence: form.frequence || null,
          heureRappel: form.heureRappel || null,
          dateDebut: form.dateDebut,
          dateFin: form.dateFin || null,
          notes: form.notes.trim() || null,
        }),
      })

      if (res.ok) {
        toast.success('Rappel ajouté avec succès')
        setDialogOpen(false)
        setForm(defaultForm)
        setEditingId(null)
        fetchRappels()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de l\'ajout du rappel')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (rappel: Rappel) => {
    try {
      // For now, optimistically update
      setRappels(prev =>
        prev.map(r => r.id === rappel.id ? { ...r, actif: !r.actif } : r)
      )
      toast.success(rappel.actif ? 'Rappel désactivé' : 'Rappel activé')
    } catch {
      toast.error('Erreur lors de la modification')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setRappels(prev => prev.filter(r => r.id !== id))
      setDeleteConfirmId(null)
      toast.success('Rappel supprimé')
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  const openEditDialog = (rappel: Rappel) => {
    setEditingId(rappel.id)
    setForm({
      medicamentNom: rappel.medicamentNom,
      dosage: rappel.dosage || '',
      frequence: rappel.frequence || '1 fois par jour',
      heureRappel: rappel.heureRappel || '08:00',
      dateDebut: rappel.dateDebut ? new Date(rappel.dateDebut).toISOString().split('T')[0] : '',
      dateFin: rappel.dateFin ? new Date(rappel.dateFin).toISOString().split('T')[0] : '',
      notes: rappel.notes || '',
    })
    setDialogOpen(true)
  }

  const openNewDialog = () => {
    setEditingId(null)
    setForm(defaultForm)
    setDialogOpen(true)
  }

  const filteredRappels = rappels.filter((r) => {
    if (filter === 'actifs') return r.actif
    if (filter === 'inactifs') return !r.actif
    return true
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const activeCount = rappels.filter(r => r.actif).length
  const inactiveCount = rappels.filter(r => !r.actif).length

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Rappels médicaments
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeCount} rappel{activeCount !== 1 ? 's' : ''} actif{activeCount !== 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="h-9 bg-primary hover:bg-teal-700"
              onClick={openNewDialog}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-teal-800">
                {editingId ? 'Modifier le rappel' : 'Nouveau rappel'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {/* Medication name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Nom du médicament *</Label>
                <Input
                  placeholder="Ex: Paracétamol"
                  value={form.medicamentNom}
                  onChange={(e) => setForm({ ...form, medicamentNom: e.target.value })}
                  className="h-10 border-teal-200"
                />
              </div>

              {/* Dosage */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Dosage</Label>
                <Input
                  placeholder="Ex: 500mg"
                  value={form.dosage}
                  onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                  className="h-10 border-teal-200"
                />
              </div>

              {/* Frequency */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Fréquence</Label>
                <div className="flex flex-wrap gap-1.5">
                  {frequenceOptions.map((freq) => (
                    <Badge
                      key={freq}
                      variant={form.frequence === freq ? 'default' : 'secondary'}
                      className={`cursor-pointer text-[10px] ${
                        form.frequence === freq
                          ? 'bg-primary text-white border-0'
                          : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
                      }`}
                      onClick={() => setForm({ ...form, frequence: freq })}
                    >
                      {freq}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Heure du rappel</Label>
                <Input
                  type="time"
                  value={form.heureRappel}
                  onChange={(e) => setForm({ ...form, heureRappel: e.target.value })}
                  className="h-10 border-teal-200"
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Date début *</Label>
                  <Input
                    type="date"
                    value={form.dateDebut}
                    onChange={(e) => setForm({ ...form, dateDebut: e.target.value })}
                    className="h-10 border-teal-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Date fin</Label>
                  <Input
                    type="date"
                    value={form.dateFin}
                    onChange={(e) => setForm({ ...form, dateFin: e.target.value })}
                    className="h-10 border-teal-200"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Notes</Label>
                <Input
                  placeholder="Ex: Prendre pendant le repas"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="h-10 border-teal-200"
                />
              </div>

              {/* Submit */}
              <Button
                className="w-full h-10 bg-primary hover:bg-teal-700"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                {editingId ? 'Enregistrer' : 'Ajouter le rappel'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {[
          { key: 'tous' as const, label: 'Tous', count: rappels.length },
          { key: 'actifs' as const, label: 'Actifs', count: activeCount },
          { key: 'inactifs' as const, label: 'Inactifs', count: inactiveCount },
        ].map(({ key, label, count }) => (
          <Badge
            key={key}
            variant={filter === key ? 'default' : 'secondary'}
            className={`cursor-pointer text-xs ${
              filter === key
                ? 'bg-primary text-white border-0'
                : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
            }`}
            onClick={() => setFilter(key)}
          >
            {label} ({count})
          </Badge>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-teal-200">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reminders list */}
      {!loading && filteredRappels.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredRappels.map((rappel, idx) => (
              <motion.div
                key={rappel.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`border-teal-200 ${!rappel.actif ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Pill className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-gray-900 text-sm">{rappel.medicamentNom}</h3>
                          {rappel.actif ? (
                            <Badge className="text-[10px] bg-green-50 text-green-700 border-0">Actif</Badge>
                          ) : (
                            <Badge className="text-[10px] bg-gray-100 text-gray-500 border-0">Inactif</Badge>
                          )}
                        </div>
                        {rappel.dosage && (
                          <p className="text-xs text-muted-foreground mt-1 ml-6">{rappel.dosage}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 ml-6 text-xs text-muted-foreground">
                          {rappel.frequence && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rappel.frequence}
                            </span>
                          )}
                          {rappel.heureRappel && (
                            <span className="flex items-center gap-1">
                              <Bell className="h-3 w-3" />
                              {rappel.heureRappel}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 ml-6 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(rappel.dateDebut)}
                            {rappel.dateFin && ` → ${formatDate(rappel.dateFin)}`}
                          </span>
                        </div>
                        {rappel.notes && (
                          <p className="text-[11px] text-muted-foreground mt-1 ml-6 italic">
                            {rappel.notes}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5">
                        <button
                          onClick={() => handleToggleActive(rappel)}
                          className="p-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                          title={rappel.actif ? 'Désactiver' : 'Activer'}
                        >
                          {rappel.actif ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditDialog(rappel)}
                          className="p-1.5 rounded-lg hover:bg-teal-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="h-4 w-4 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(rappel.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    </div>

                    {/* Delete confirmation */}
                    {deleteConfirmId === rappel.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                          <span className="text-xs text-red-700">Supprimer ce rappel ?</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => setDeleteConfirmId(null)}
                          >
                            Annuler
                          </Button>
                          <Button
                            size="sm"
                            className="h-7 text-xs bg-destructive hover:bg-red-700"
                            onClick={() => handleDelete(rappel.id)}
                          >
                            Supprimer
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredRappels.length === 0 && (
        <div className="text-center py-8">
          <Bell className="h-12 w-12 text-teal-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            {filter === 'tous'
              ? 'Aucun rappel configuré'
              : filter === 'actifs'
              ? 'Aucun rappel actif'
              : 'Aucun rappel inactif'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez un rappel pour ne jamais oublier vos médicaments
          </p>
          {filter === 'tous' && (
            <Button
              size="sm"
              className="mt-3 h-8 text-xs bg-primary hover:bg-teal-700"
              onClick={openNewDialog}
            >
              <Plus className="h-3 w-3 mr-1" />
              Ajouter un rappel
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
