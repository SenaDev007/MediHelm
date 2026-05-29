'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FileText, Search, CheckCircle2, Clock, AlertCircle, Eye } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'

interface Ordonnance {
  id: string
  prescripteurNom: string
  prescripteurInami: string | null
  dateOrdonnance: string
  dateReception: string
  statut: string
  estStupefiant: boolean
  numeroRegistre: string | null
  patient: { nom: string; prenom: string } | null
  lignes: {
    id: string
    posologie: string
    duree: string
    quantite: number
    delivree: boolean
    medicament: { nomCommercial: string; dci: string }
  }[]
  validations: {
    id: string
    typeValidation: string
    commentaire: string | null
    createdAt: string
  }[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const statutConfig: Record<string, { label: string; color: string }> = {
  RECUE: { label: 'Reçue', color: 'bg-blue-500 text-white' },
  EN_COURS_VALIDATION: { label: 'En validation', color: 'bg-amber-400 text-gray-900' },
  VALIDEE: { label: 'Validée', color: 'bg-primary text-white' },
  PARTIELLEMENT_DELIVREE: { label: 'Partielle', color: 'bg-orange-500 text-white' },
  DELIVREE: { label: 'Délivrée', color: 'bg-green-600 text-white' },
  REFUSEE: { label: 'Refusée', color: 'bg-destructive text-white' },
}

export default function OrdonnancesPage() {
  const { pharmacie } = useAuth()
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Ordonnance | null>(null)

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      fetch(`/api/ordonnances?pharmacieId=${pharmacie.id}`)
        .then(r => r.ok ? r.json() : [])
        .then(data => setOrdonnances(data))
        .catch(() => setOrdonnances([]))
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const filtered = useMemo(() => {
    if (!search) return ordonnances
    const q = search.toLowerCase()
    return ordonnances.filter(o =>
      o.prescripteurNom.toLowerCase().includes(q) ||
      (o.patient && `${o.patient.nom} ${o.patient.prenom}`.toLowerCase().includes(q)) ||
      o.numeroRegistre?.includes(q)
    )
  }, [ordonnances, search])

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-primary" />
          Ordonnances
        </h1>
        <p className="text-sm text-muted-foreground">{ordonnances.length} ordonnances</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Rechercher par prescripteur, patient..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune ordonnance trouvée</CardContent></Card>
        ) : (
          filtered.map(ordo => {
            const config = statutConfig[ordo.statut] || statutConfig.RECUE
            const delivreCount = ordo.lignes.filter(l => l.delivree).length

            return (
              <Card key={ordo.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(ordo)}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">Dr. {ordo.prescripteurNom}</span>
                          <Badge className={`text-[9px] ${config.color}`}>{config.label}</Badge>
                          {ordo.estStupefiant && <Badge variant="destructive" className="text-[9px]">Stupéfiant</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {ordo.patient ? `${ordo.patient.prenom} ${ordo.patient.nom} • ` : ''}
                          {formatDate(ordo.dateOrdonnance)}
                          {ordo.numeroRegistre && ` • Registre: ${ordo.numeroRegistre}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="text-center">
                        <span className="text-xs text-muted-foreground block">Lignes</span>
                        <span className="font-semibold">{delivreCount}/{ordo.lignes.length}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="w-3 h-3" /> Voir
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Ordonnance — Dr. {selected.prescripteurNom}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Patient</span><p className="font-medium">{selected.patient ? `${selected.patient.prenom} ${selected.patient.nom}` : '—'}</p></div>
                    <div><span className="text-muted-foreground">Date</span><p className="font-medium">{formatDate(selected.dateOrdonnance)}</p></div>
                    <div><span className="text-muted-foreground">Statut</span><p><Badge className={statutConfig[selected.statut]?.color}>{statutConfig[selected.statut]?.label}</Badge></p></div>
                    <div><span className="text-muted-foreground">Registre</span><p className="font-medium">{selected.numeroRegistre || '—'}</p></div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">Médicaments prescrits</h4>
                    {selected.lignes.map(l => (
                      <div key={l.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div>
                          <span className="font-medium">{l.medicament.nomCommercial}</span>
                          <span className="text-xs text-muted-foreground ml-2">({l.medicament.dci})</span>
                          <span className="text-xs text-muted-foreground block">{l.posologie} — {l.duree}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">×{l.quantite}</span>
                          {l.delivree ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-amber-500" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selected.validations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Validations</h4>
                      {selected.validations.map(v => (
                        <div key={v.id} className="flex items-center gap-2 py-1 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span>{v.typeValidation}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
