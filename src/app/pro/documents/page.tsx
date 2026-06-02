'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { FolderOpen, Plus, Upload, FileText, Shield, AlertCircle, Download, Lock } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'

interface DocItem {
  id: string
  nom: string
  type: string
  fichierUrl: string | null
  dateEmission: string | null
  dateExpiration: string | null
  estConfidentiel: boolean
  createdAt: string
}

interface DocRegItem {
  id: string
  typeDocument: string
  dateEmission: string | null
  dateExpiration: string | null
  statut: string
}

const typeDocLabels: Record<string, string> = {
  LICENCE: 'Licence',
  DIPLOME: 'Diplôme',
  CONTRAT: 'Contrat',
  ASSURANCE: 'Assurance',
  AUTRE: 'Autre',
}

const typeRegLabels: Record<string, string> = {
  LICENCE_EXPLOITATION: "Licence d'exploitation",
  DIPLOME_PHARMACIEN: 'Diplôme de pharmacien',
  ASSURANCE: 'Assurance',
  AGREMENT_DPMED: 'Agrément DPMED',
  AUTORISATION_STUPEFIANTS: 'Autorisation stupéfiants',
}

function getExpirationStatus(dateExpiration: string | null): { status: string; daysLeft: number } {
  if (!dateExpiration) return { status: 'NO_EXPIRY', daysLeft: -1 }
  const now = new Date()
  const exp = new Date(dateExpiration)
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { status: 'EXPIRE', daysLeft: diffDays }
  if (diffDays <= 90) return { status: 'EXPIRE_BIENTOT', daysLeft: diffDays }
  return { status: 'VALIDE', daysLeft: diffDays }
}

export default function DocumentsPage() {
  const { pharmacie } = useAuth()
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [documentsReg, setDocumentsReg] = useState<DocRegItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)

  // Upload form
  const [formNom, setFormNom] = useState('')
  const [formType, setFormType] = useState('AUTRE')
  const [formFichierUrl, setFormFichierUrl] = useState('')
  const [formDateEmission, setFormDateEmission] = useState('')
  const [formDateExpiration, setFormDateExpiration] = useState('')
  const [formConfidentiel, setFormConfidentiel] = useState(false)

  const loadData = useCallback(async () => {
    if (!pharmacie?.id) return
    try {
      const [docsRes, docsRegRes] = await Promise.all([
        fetch(`/api/documents?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/conformite/documents?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      ])
      setDocuments(docsRes)
      setDocumentsReg(docsRegRes)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [pharmacie?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const allDocuments = useMemo(() => {
    const generalDocs = documents.map(d => {
      const exp = getExpirationStatus(d.dateExpiration)
      return { ...d, source: 'general' as const, expStatus: exp.status, daysLeft: exp.daysLeft }
    })
    const regDocs = documentsReg.map(d => ({
      ...d,
      nom: typeRegLabels[d.typeDocument] || d.typeDocument,
      type: d.typeDocument,
      fichierUrl: null,
      estConfidentiel: false,
      createdAt: '',
      source: 'reglementaire' as const,
      expStatus: d.statut,
      daysLeft: d.dateExpiration ? getExpirationStatus(d.dateExpiration).daysLeft : -1,
    }))
    return [...generalDocs, ...regDocs]
  }, [documents, documentsReg])

  const docsExpiringSoon = allDocuments.filter(d => d.expStatus === 'EXPIRE_BIENTOT').length
  const docsExpires = allDocuments.filter(d => d.expStatus === 'EXPIRE').length
  const docsValides = allDocuments.filter(d => d.expStatus === 'VALIDE').length

  // Upload document
  const handleUpload = async () => {
    if (!pharmacie?.id || !formNom || !formFichierUrl) return
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nom: formNom,
          type: formType,
          fichierUrl: formFichierUrl,
          dateEmission: formDateEmission || null,
          dateExpiration: formDateExpiration || null,
          estConfidentiel: formConfidentiel,
        }),
      })
      if (res.ok) {
        toast.success('Document ajouté')
        setUploadDialogOpen(false)
        setFormNom(''); setFormType('AUTRE'); setFormFichierUrl('')
        setFormDateEmission(''); setFormDateExpiration(''); setFormConfidentiel(false)
        loadData()
      }
    } catch {
      toast.error('Erreur lors de l\'ajout')
    }
  }

  const getBadgeVariant = (status: string) => {
    if (status === 'VALIDE') return 'default'
    if (status === 'EXPIRE_BIENTOT') return 'secondary'
    return 'destructive'
  }

  const getBadgeLabel = (status: string, daysLeft: number) => {
    if (status === 'VALIDE') return 'Valide'
    if (status === 'EXPIRE_BIENTOT') return `Expire dans ${daysLeft}j`
    if (status === 'EXPIRE') return 'Expiré'
    if (status === 'NO_EXPIRY') return 'Sans expiration'
    return status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderOpen className="w-6 h-6 text-primary" />
            Gestion Documentaire
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Coffre-fort numérique et documents officiels</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={() => setUploadDialogOpen(true)}>
          <Upload className="w-4 h-4" />
          Ajouter document
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{allDocuments.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents valides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{docsValides}</p>
          </CardContent>
        </Card>
        <Card className={docsExpiringSoon > 0 ? 'border-amber-400' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              Expiration &lt; 90j
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{docsExpiringSoon}</p>
          </CardContent>
        </Card>
        <Card className={docsExpires > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Expirés</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{docsExpires}</p>
          </CardContent>
        </Card>
      </div>

      {/* Coffre-fort numérique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Coffre-fort numérique
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : allDocuments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              Aucun document
              <p className="text-xs mt-1">Ajoutez vos documents pour les gérer</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{doc.nom}</p>
                        {doc.source === 'reglementaire' && (
                          <Badge variant="outline" className="text-[9px]">Réglementaire</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {doc.dateExpiration ? `Expire le ${new Date(doc.dateExpiration).toLocaleDateString('fr-FR')}` : 'Sans expiration'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getBadgeVariant(doc.expStatus)} className="text-[9px]">
                      {getBadgeLabel(doc.expStatus, doc.daysLeft)}
                    </Badge>
                    {doc.estConfidentiel && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Lock className="w-3 h-3" /> Confidentiel
                      </Badge>
                    )}
                    {doc.fichierUrl && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => toast.success('Téléchargement en cours')}>
                        <Download className="w-3 h-3" /> Télécharger
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un document</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Nom du document</Label><Input placeholder="Licence d'exploitation" value={formNom} onChange={e => setFormNom(e.target.value)} /></div>
            <div>
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LICENCE">Licence</SelectItem>
                  <SelectItem value="DIPLOME">Diplôme</SelectItem>
                  <SelectItem value="CONTRAT">Contrat</SelectItem>
                  <SelectItem value="ASSURANCE">Assurance</SelectItem>
                  <SelectItem value="AUTRE">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>URL du fichier</Label><Input placeholder="https://..." value={formFichierUrl} onChange={e => setFormFichierUrl(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date d&apos;émission</Label><Input type="date" value={formDateEmission} onChange={e => setFormDateEmission(e.target.value)} /></div>
              <div><Label>Date d&apos;expiration</Label><Input type="date" value={formDateExpiration} onChange={e => setFormDateExpiration(e.target.value)} /></div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={formConfidentiel} onChange={e => setFormConfidentiel(e.target.checked)} className="rounded" />
              <Label>Document confidentiel</Label>
            </div>
            <Button className="w-full" onClick={handleUpload}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
