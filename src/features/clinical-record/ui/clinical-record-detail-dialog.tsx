import type { ClinicalRecord, ClinicalRecordType } from '@/shared/types/database'
import type { AssessmentStructuredData, ExamFinding, PhysicalExamFindingKey } from '@/entities/clinical-record/model/assessment-schema'
import type { AnamneseStructuredData } from '@/entities/clinical-record/model/anamnese-schema'
import type { DischargeStructuredData } from '@/entities/clinical-record/model/discharge-schema'
import type { EvolutionStructuredData } from '@/entities/clinical-record/model/evolution-schema'
import type { VitalSigns } from '@/entities/clinical-record/model/vital-signs'
import { EXAM_STATUS_OPTIONS } from '@/entities/clinical-record/model/exam-status'
import { extractDeficitSummary } from '@/entities/clinical-record/model/summaries'
import { Badge } from '@/shared/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog'
import { formatDateTime, formatDate } from '@/shared/lib/dates'
import { pt } from '@/shared/config/i18n/pt'

const TYPE_LABEL: Record<ClinicalRecordType, string> = {
  initial_assessment: pt.clinicalRecord.initialAssessment,
  evolution: pt.clinicalRecord.evolution,
  reassessment: pt.clinicalRecord.reassessment,
  anamnese: pt.clinicalRecord.anamnese,
  discharge: pt.clinicalRecord.discharge,
}

const FINDING_LABELS: Array<{ key: PhysicalExamFindingKey; label: string }> = [
  { key: 'ausculta', label: pt.clinicalRecord.ausculta },
  { key: 'mrc', label: pt.clinicalRecord.mrc },
  { key: 'goniometria', label: pt.clinicalRecord.goniometria },
  { key: 'posturalChanges', label: pt.clinicalRecord.posturalChanges },
  { key: 'gaitChanges', label: pt.clinicalRecord.gaitChanges },
  { key: 'superficialReflexes', label: pt.clinicalRecord.superficialReflexes },
  { key: 'deepReflexes', label: pt.clinicalRecord.deepReflexes },
  { key: 'staticBalance', label: pt.clinicalRecord.staticBalance },
  { key: 'dynamicBalance', label: pt.clinicalRecord.dynamicBalance },
  { key: 'specialTests', label: pt.clinicalRecord.specialTests },
]

const ACTIVITY_LABELS: Array<{
  key: keyof Pick<
    EvolutionStructuredData,
    'performed' | 'exercises' | 'training' | 'strengthening' | 'changes' | 'conduct'
  >
  label: string
}> = [
  { key: 'performed', label: pt.clinicalRecord.performed },
  { key: 'exercises', label: pt.clinicalRecord.exercises },
  { key: 'training', label: pt.clinicalRecord.training },
  { key: 'strengthening', label: pt.clinicalRecord.strengthening },
  { key: 'changes', label: pt.clinicalRecord.changesObserved },
  { key: 'conduct', label: pt.clinicalRecord.conduct },
]

interface ClinicalRecordDetailDialogProps {
  record: ClinicalRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

function asAssessment(raw: unknown): AssessmentStructuredData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as AssessmentStructuredData
  if (!data.anamnese || !data.physicalExam) return null
  return data
}

function asEvolution(raw: unknown): EvolutionStructuredData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as EvolutionStructuredData
  if (!data.vitals) return null
  if (!('sessionConducts' in data) && !('performed' in data)) return null
  return data
}

function asAnamnese(raw: unknown): AnamneseStructuredData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as AnamneseStructuredData
  if (!data.anamnese) return null
  return data
}

function asDischarge(raw: unknown): DischargeStructuredData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as DischargeStructuredData
  if (!('treatmentSummary' in data) && !('guidelines' in data)) return null
  return data
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {label}
      </p>
      <p className="whitespace-pre-wrap text-sm">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-[var(--color-border)] p-3.5">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function formatVitals(v: VitalSigns): string {
  const parts: string[] = []
  if (v.hr != null) parts.push(`FC ${v.hr}`)
  if (v.rr != null) parts.push(`FR ${v.rr}`)
  if (v.spo2 != null) parts.push(`SpO₂ ${v.spo2}%`)
  if (v.bpSystolic != null || v.bpDiastolic != null) {
    parts.push(`PA ${v.bpSystolic ?? '—'}/${v.bpDiastolic ?? '—'}`)
  }
  if (v.temperature != null) parts.push(`Temp ${v.temperature}°C`)
  return parts.join(' · ')
}

function statusLabel(status: ExamFinding['status']) {
  return EXAM_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status
}

function FindingBlock({ label, finding }: { label: string; finding: ExamFinding }) {
  if (finding.status === 'nao_avaliado' && !finding.notes && !finding.items?.length) return null
  return (
    <div className="space-y-1 rounded-md bg-[var(--color-muted)]/30 p-2.5 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{label}</span>
        <Badge variant="outline">{statusLabel(finding.status)}</Badge>
      </div>
      {finding.items?.length > 0 && (
        <p className="text-[var(--color-muted-foreground)]">{finding.items.join(', ')}</p>
      )}
      {finding.notes && <p className="whitespace-pre-wrap">{finding.notes}</p>}
    </div>
  )
}

function AssessmentView({ data }: { data: AssessmentStructuredData }) {
  const deficits = extractDeficitSummary(data)
  const p = data.personalData
  const address = [p.addressLine1, p.addressLine2, p.city, p.province, p.postalCode]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="space-y-4">
      <Section title={pt.clinicalRecord.personalData}>
        <Field label={pt.clinicalRecord.fullName} value={p.fullName} />
        <Field label={pt.clinicalRecord.phone} value={p.phone} />
        <Field label={pt.clinicalRecord.identity} value={p.identityDocument} />
        <Field label={pt.clinicalRecord.dateOfBirth} value={p.dateOfBirth} />
        <Field label={pt.clinicalRecord.address} value={address} />
      </Section>

      <Section title={pt.clinicalRecord.anamnese}>
        <Field label={pt.clinicalRecord.chiefComplaint} value={data.anamnese.chiefComplaint} />
        <Field label={pt.clinicalRecord.hda} value={data.anamnese.currentIllnessHistory} />
        <Field label={pt.clinicalRecord.hpp} value={data.anamnese.pastMedicalHistory} />
        <Field label={pt.clinicalRecord.medications} value={data.anamnese.medications} />
        <Field label={pt.clinicalRecord.previousSurgeries} value={data.anamnese.previousSurgeries} />
      </Section>

      <Section title={pt.clinicalRecord.physicalExam}>
        <Field label={pt.clinicalRecord.vitalSigns} value={formatVitals(data.physicalExam.vitals) || null} />
        {FINDING_LABELS.map(({ key, label }) => (
          <FindingBlock key={key} label={label} finding={data.physicalExam[key]} />
        ))}
      </Section>

      <Section title={pt.clinicalRecord.specificFindings}>
        {deficits.length ? (
          <ul className="list-inside list-disc text-sm">
            {deficits.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">—</p>
        )}
        <Field
          label={pt.clinicalRecord.shortenings}
          value={
            data.findings.shorteningsDeformities.yes == null
              ? null
              : data.findings.shorteningsDeformities.yes
                ? `Sim${data.findings.shorteningsDeformities.detail ? ` — ${data.findings.shorteningsDeformities.detail}` : ''}`
                : 'Não'
          }
        />
        <Field
          label={pt.clinicalRecord.strengthLoss}
          value={
            data.findings.muscleStrengthLoss.yes == null
              ? null
              : data.findings.muscleStrengthLoss.yes
                ? `Sim${data.findings.muscleStrengthLoss.detail ? ` — ${data.findings.muscleStrengthLoss.detail}` : ''}`
                : 'Não'
          }
        />
        <Field
          label={pt.clinicalRecord.mobilityLoss}
          value={
            data.findings.mobilityLoss.yes == null
              ? null
              : data.findings.mobilityLoss.yes
                ? `Sim${data.findings.mobilityLoss.detail ? ` — ${data.findings.mobilityLoss.detail}` : ''}`
                : 'Não'
          }
        />
      </Section>

      <Section title={pt.clinicalRecord.therapeuticPlan}>
        <Field label={pt.clinicalRecord.shortTermGoal} value={data.therapeuticPlan.shortTermGoal} />
        <Field label={pt.clinicalRecord.longTermGoal} value={data.therapeuticPlan.longTermGoal} />
      </Section>
    </div>
  )
}

function EvolutionView({ data }: { data: EvolutionStructuredData }) {
  const sessionConductsText =
    data.sessionConducts?.trim() ||
    null

  return (
    <div className="space-y-4">
      <Section title={pt.clinicalRecord.vitalSigns}>
        <p className="text-sm">{formatVitals(data.vitals) || '—'}</p>
      </Section>

      <Section title={pt.clinicalRecord.sessionConducts}>
        {sessionConductsText ? (
          <p className="whitespace-pre-wrap text-sm">{sessionConductsText}</p>
        ) : (
          ACTIVITY_LABELS.map(({ key, label }) => {
            const act = data[key]
            if (!act?.done && !act?.notes && !(act?.items?.length)) return null
            return (
              <div key={key} className="space-y-1 rounded-md bg-[var(--color-muted)]/30 p-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{label}</span>
                  {act.done && <Badge variant="success">{pt.clinicalRecord.yes}</Badge>}
                </div>
                {act.items?.length > 0 && (
                  <p className="text-[var(--color-muted-foreground)]">{act.items.join(', ')}</p>
                )}
                {act.notes && <p className="whitespace-pre-wrap">{act.notes}</p>}
              </div>
            )
          })
        )}
      </Section>

      <Field label={pt.clinicalRecord.observations} value={data.observations} />
    </div>
  )
}

function LegacyView({ record }: { record: ClinicalRecord }) {
  return (
    <div className="space-y-3 text-sm">
      <Field label={pt.clinicalRecord.initialAssessment} value={record.assessment} />
      <Field label={pt.clinicalRecord.evolution} value={record.evolution} />
      <Field label={pt.clinicalRecord.therapeuticPlan} value={record.treatment_plan} />
      <Field label={pt.clinicalRecord.observations} value={record.observations} />
      <Field label={pt.clinicalRecord.conduct} value={record.recommendations} />
    </div>
  )
}

export function ClinicalRecordDetailDialog({
  record,
  open,
  onOpenChange,
}: ClinicalRecordDetailDialogProps) {
  if (!record) return null

  const type = (record.record_type ?? 'evolution') as ClinicalRecordType
  const assessment = asAssessment(record.structured_data)
  const evolution = asEvolution(record.structured_data)
  const anamnese = asAnamnese(record.structured_data)
  const discharge = asDischarge(record.structured_data)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2 pr-6">
            <DialogTitle>{TYPE_LABEL[type]}</DialogTitle>
            <Badge variant="secondary">{formatDateTime(record.created_at)}</Badge>
          </div>
          <DialogDescription>
            {record.next_evaluation_at
              ? `${pt.clinicalRecord.nextEvaluation}: ${formatDate(record.next_evaluation_at)}`
              : pt.clinicalRecord.recordDetailHint}
          </DialogDescription>
        </DialogHeader>

        {assessment && (type === 'initial_assessment' || type === 'reassessment') ? (
          <AssessmentView data={assessment} />
        ) : evolution && type === 'evolution' ? (
          <EvolutionView data={evolution} />
        ) : anamnese && type === 'anamnese' ? (
          <Section title={pt.clinicalRecord.anamnese}>
            <Field label={pt.clinicalRecord.chiefComplaint} value={anamnese.anamnese.chiefComplaint} />
            <Field label={pt.clinicalRecord.hda} value={anamnese.anamnese.currentIllnessHistory} />
            <Field label={pt.clinicalRecord.hpp} value={anamnese.anamnese.pastMedicalHistory} />
            <Field label={pt.clinicalRecord.medications} value={anamnese.anamnese.medications} />
            <Field label={pt.clinicalRecord.previousSurgeries} value={anamnese.anamnese.previousSurgeries} />
          </Section>
        ) : discharge && type === 'discharge' ? (
          <Section title={pt.clinicalRecord.discharge}>
            <Field label={pt.clinic.dischargeDate} value={discharge.dischargeDate} />
            <Field label={pt.clinic.dischargeResponsible} value={discharge.responsibleName} />
            <Field label={pt.clinic.treatmentSummary} value={discharge.treatmentSummary} />
            <Field label={pt.clinic.dischargeConducts} value={discharge.conducts} />
            <Field label={pt.clinic.dischargeGuidelines} value={discharge.guidelines} />
            <Field label={pt.clinic.dischargeDestination} value={discharge.destination} />
          </Section>
        ) : (
          <LegacyView record={record} />
        )}
      </DialogContent>
    </Dialog>
  )
}
