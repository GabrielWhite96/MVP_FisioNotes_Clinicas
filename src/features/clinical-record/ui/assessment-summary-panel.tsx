import type { AssessmentStructuredData } from '@/entities/clinical-record/model/assessment-schema'
import { extractDeficitSummary } from '@/entities/clinical-record/model/summaries'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { pt } from '@/shared/config/i18n/pt'

interface AssessmentSummaryPanelProps {
  data: AssessmentStructuredData | null
  title?: string
  sticky?: boolean
}

function SummaryField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <div className="text-sm">{children}</div>
    </div>
  )
}

export function AssessmentSummaryPanel({ data, title, sticky }: AssessmentSummaryPanelProps) {
  if (!data) {
    return (
      <Card className={sticky ? 'lg:sticky lg:top-4' : undefined}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{title ?? pt.clinicalRecord.assessmentSummary}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinicalRecord.noAssessmentYet}</p>
        </CardContent>
      </Card>
    )
  }

  const deficits = extractDeficitSummary(data)

  return (
    <Card className={sticky ? 'lg:sticky lg:top-4' : undefined}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title ?? pt.clinicalRecord.assessmentSummary}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <SummaryField label={pt.clinicalRecord.chiefComplaint}>
          <p>{data.anamnese.chiefComplaint || '—'}</p>
        </SummaryField>

        <SummaryField label={pt.clinicalRecord.deficits}>
          {deficits.length ? (
            <ul className="list-inside list-disc">
              {deficits.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : (
            <p>—</p>
          )}
        </SummaryField>

        <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            {pt.clinicalRecord.therapeuticPlan}
          </p>
          <SummaryField label={pt.clinicalRecord.shortTermGoal}>
            <p>{data.therapeuticPlan.shortTermGoal || '—'}</p>
          </SummaryField>
          <SummaryField label={pt.clinicalRecord.longTermGoal}>
            <p>{data.therapeuticPlan.longTermGoal || '—'}</p>
          </SummaryField>
        </div>
      </CardContent>
    </Card>
  )
}
