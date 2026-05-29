'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FolderOpen, Plus, Upload, FileText, Shield, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

interface DocItem {
  id: string
  nom: string
  type: string
  dateExpiration?: string
  estConfidentiel: boolean
  statut?: string
}

export default function DocumentsPage() {
  const { pharmacie } = useAuth()
  const [documents, setDocuments] = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pharmacie?.id) {
      fetch(`/api/pharmacies?pharmacieId=${pharmacie.id}`)
        .then(() => {
          setDocuments([
            { id: '1', nom: 'Licence d\'exploitation', type: 'LICENCE', dateExpiration: '2026-12-31', estConfidentiel: true, statut: 'VALIDE' },
            { id: '2', nom: 'Diplôme Pharmacien - Dr. Adjo', type: 'DIPLOME', estConfidentiel: true, statut: 'VALIDE' },
            { id: '3', nom: 'Assurance RC Pro', type: 'ASSURANCE', dateExpiration: '2025-09-30', estConfidentiel: false, statut: 'EXPIRE_BIENTOT' },
            { id: '4', nom: 'Agrément DPMED', type: 'AUTRE', dateExpiration: '2027-03-15', estConfidentiel: false, statut: 'VALIDE' },
            { id: '5', nom: 'Autorisation stupéfiants', type: 'AUTRE', dateExpiration: '2025-07-01', estConfidentiel: true, statut: 'EXPIRE_BIENTOT' },
          ])
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const docsExpiringSoon = documents.filter(d => d.statut === 'EXPIRE_BIENTOT').length

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
        <Button className="bg-primary hover:bg-primary/90" onClick={() => toast('Fonctionnalité bientôt disponible')}>
          <Upload className="w-4 h-4 mr-2" />
          Ajouter document
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total documents</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{documents.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Documents valides</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{documents.filter(d => d.statut === 'VALIDE').length}</p>
          </CardContent>
        </Card>
        <Card className={docsExpiringSoon > 0 ? 'border-amber-400' : ''}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3 text-amber-500" />
              Expiration proche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">{docsExpiringSoon}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Documents officiels
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{doc.nom}</p>
                      <p className="text-sm text-muted-foreground">
                        {doc.dateExpiration ? `Expire le ${doc.dateExpiration}` : 'Sans expiration'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={doc.statut === 'VALIDE' ? 'default' : doc.statut === 'EXPIRE_BIENTOT' ? 'secondary' : 'destructive'}>
                      {doc.statut === 'VALIDE' ? 'Valide' : doc.statut === 'EXPIRE_BIENTOT' ? 'Expire bientôt' : 'Expiré'}
                    </Badge>
                    {doc.estConfidentiel && (
                      <Badge variant="outline" className="text-xs">Confidentiel</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
