import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { ClinicalRecord, ClinicalRecordType } from '@/shared/types/database'
import { Badge } from '@/shared/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/states'
import { formatDateTime, formatDate } from '@/shared/lib/dates'
import { pt } from '@/shared/config/i18n/pt'
import { ClinicalRecordDetailDialog } from './clinical-record-detail-dialog'

const TYPE_LABEL: Record<ClinicalRecordType, string> = {
  initial_assessment: pt.clinicalRecord.initialAssessment,
  evolution: pt.clinicalRecord.evolution,
  reassessment: pt.clinicalRecord.reassessment,
  anamnese: pt.clinicalRecord.anamnese,
  discharge: pt.clinicalRecord.discharge,
}

const TYPE_VARIANT: Record<ClinicalRecordType, 'default' | 'secondary' | 'outline'> = {
  initial_assessment: 'default',
  evolution: 'secondary',
  reassessment: 'outline',
  anamnese: 'outline',
  discharge: 'secondary',
}

interface ClinicalRecordListProps {
  records: ClinicalRecord[]
}

function preview(record: ClinicalRecord): string {
  const text =
    record.assessment ||
    record.evolution ||
    record.treatment_plan ||
    record.observations ||
    ''
  return text.length > 160 ? `${text.slice(0, 160)}…` : text
}

export function ClinicalRecordList({ records }: ClinicalRecordListProps) {
  const [selected, setSelected] = useState<ClinicalRecord | null>(null)

  if (!records.length) {
    return <EmptyState title={pt.clinicalRecord.emptyHistory} description={pt.clinicalRecord.emptyHistoryHint} />
  }

  return (
    <>
      <div className="space-y-3">
        {records.map((r) => {
          const type = (r.record_type ?? 'evolution') as ClinicalRecordType
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelected(r)}
              className="block w-full text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] rounded-lg"
            >
              <Card className="cursor-pointer transition-colors hover:border-[var(--color-primary)]/40">
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{formatDateTime(r.created_at)}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={TYPE_VARIANT[type]}>{TYPE_LABEL[type]}</Badge>
                    <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {preview(r) ? (
                    <p className="whitespace-pre-wrap text-[var(--color-muted-foreground)]">{preview(r)}</p>
                  ) : (
                    <p className="text-[var(--color-muted-foreground)]">
                      {pt.clinicalRecord.clickToOpen}
                    </p>
                  )}
                  {r.next_evaluation_at && (
                    <p className="text-xs">
                      {pt.clinicalRecord.nextEvaluation}: {formatDate(r.next_evaluation_at)}
                    </p>
                  )}
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      <ClinicalRecordDetailDialog
        record={selected}
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      />
    </>
  )
}
