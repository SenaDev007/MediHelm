'use client'

import {
  ClipboardCheck,
  Download,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ComplianceOverview } from '@/components/institutions/compliance-overview'
import { toast } from 'sonner'

export default function ConformitePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-teal-800 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6" />
            Conformité réglementaire
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Scores de conformité des officines et certification DPMED
          </p>
        </div>
        <Button variant="outline" onClick={() => toast.info('Export PDF en préparation...')} className="border-teal-300 text-teal-700">
          <Download className="h-4 w-4 mr-1" />
          Exporter rapport
        </Button>
      </div>

      {/* Compliance Overview Component */}
      <ComplianceOverview />
    </div>
  )
}
