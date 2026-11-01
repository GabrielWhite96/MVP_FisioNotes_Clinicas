import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getAssessmentsForComparison,
  getClinicalRecords,
  getLatestInitialOrReassessment,
  hasInitialAssessment,
} from '@/entities/clinical-record/api/clinical-record-api'
import { getPatientWithProfile } from '@/entities/patient/api/patient-api'
import { listClinicPhysiotherapists } from '@/entities/clinic-physiotherapist/api/clinic-physiotherapist-api'
import type { AssessmentStructuredData } from '@/entities/clinical-record/model/assessment-schema'
import { emptyAssessmentData } from '@/entities/clinical-record/model/defaults'
import { queryKeys } from '@/shared/api/query-keys'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { Label } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { LoadingSpinner } from '@/shared/ui/states'
import { cn } from '@/shared/lib/utils'
import { pt } from '@/shared/config/i18n/pt'
import { AssessmentForm } from './assessment-form'
import { EvolutionForm } from './evolution-form'
import { AnamneseForm } from './anamnese-form'
import { DischargeForm } from './discharge-form'
import { ClinicalRecordList } from './clinical-record-list'
import { AssessmentComparison } from './assessment-comparison'

interface ClinicalRecordWorkspaceProps {
  physiotherapistId: string
  patientId: string
  appointmentId?: string
}

type Mode = 'initial' | 'evolution' | 'reassessment' | 'anamnese' | 'discharge'
type WorkspaceTab = 'form' | 'history' | 'comparison'

function parseAssessment(raw: unknown): AssessmentStructuredData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as AssessmentStructuredData
  if (!data.anamnese || !data.physicalExam) return null
  return data
}

function ModeButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-all sm:flex-none',
        active
          ? 'bg-[var(--color-card)] shadow-sm'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
      )}
    >
      {children}
    </button>
  )
}

export function ClinicalRecordWorkspace({
  physiotherapistId,
  patientId,
  appointmentId,
}: ClinicalRecordWorkspaceProps) {
  const [tab, setTab] = useState<WorkspaceTab>('form')
  const [modeOverride, setModeOverride] = useState<Mode | null>(null)
  const [performedById, setPerformedById] = useState<string>('none')

  const hasInitialQuery = useQuery({
    queryKey: [...queryKeys.clinicalRecords(patientId), 'has-initial'],
    queryFn: () => hasInitialAssessment(patientId),
  })

  const recordsQuery = useQuery({
    queryKey: queryKeys.clinicalRecords(patientId),
    queryFn: () => getClinicalRecords(patientId),
  })

  const latestAssessmentQuery = useQuery({
    queryKey: [...queryKeys.clinicalRecords(patientId), 'latest-assessment'],
    queryFn: () => getLatestInitialOrReassessment(patientId),
    enabled: !!hasInitialQuery.data,
  })

  const comparisonQuery = useQuery({
    queryKey: [...queryKeys.clinicalRecords(patientId), 'comparison'],
    queryFn: () => getAssessmentsForComparison(patientId),
  })

  const patientQuery = useQuery({
    queryKey: ['patient-with-profile', patientId],
    queryFn: () => getPatientWithProfile(patientId),
  })

  const staffQuery = useQuery({
    queryKey: queryKeys.clinicPhysiotherapists(physiotherapistId),
    queryFn: () => listClinicPhysiotherapists(physiotherapistId, { activeOnly: true }),
    enabled: !!physiotherapistId,
  })

  const mode: Mode = useMemo(() => {
    if (modeOverride) return modeOverride
    if (hasInitialQuery.data === false) return 'initial'
    return 'evolution'
  }, [hasInitialQuery.data, modeOverride])

  const assessmentPrefill = useMemo(() => {
    const p = patientQuery.data
    const profile = p?.profiles
    return emptyAssessmentData({
      fullName: profile?.full_name ?? p?.full_name ?? '',
      phone: profile?.phone ?? p?.phone ?? '',
      identityDocument: p?.identity_document ?? '',
      dateOfBirth: p?.date_of_birth ?? '',
      addressLine1: p?.address_line1 ?? '',
      addressLine2: p?.address_line2 ?? '',
      city: p?.city ?? '',
      province: p?.province ?? '',
      postalCode: p?.postal_code ?? '',
    })
  }, [patientQuery.data])

  const summaryData = parseAssessment(latestAssessmentQuery.data?.structured_data)
  const performedBy = performedById && performedById !== 'none' ? performedById : null
  const responsibleName = staffQuery.data?.find((staff) => staff.id === performedBy)?.full_name ?? ''

  if (hasInitialQuery.isLoading || patientQuery.isLoading) {
    return <LoadingSpinner className="mx-auto h-8 w-8" />
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as WorkspaceTab)}
      className="space-y-4"
    >
      <TabsList className="w-full justify-start sm:w-auto">
        <TabsTrigger value="form">{pt.clinicalRecord.tabForm}</TabsTrigger>
        <TabsTrigger value="history">{pt.clinicalRecord.tabHistory}</TabsTrigger>
        <TabsTrigger value="comparison">{pt.clinicalRecord.tabComparison}</TabsTrigger>
      </TabsList>

      <TabsContent value="form" className="mt-0 space-y-4">
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3">
          <div className="space-y-1.5">
            <Label>{pt.clinicalRecord.performedBy}</Label>
            <Select value={performedById} onValueChange={setPerformedById}>
              <SelectTrigger>
                <SelectValue placeholder={pt.clinicalRecord.performedByNone} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{pt.clinicalRecord.performedByNone}</SelectItem>
                {(staffQuery.data ?? []).map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>{staff.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-[var(--color-muted-foreground)]">{pt.clinicalRecord.performedByHint}</p>
          </div>
          <div
            role="group"
            aria-label={pt.clinicalRecord.registerTypeHint}
            className="flex flex-wrap gap-1 rounded-md bg-[var(--color-muted)] p-1"
          >
            {!hasInitialQuery.data && (
              <ModeButton active={mode === 'initial'} onClick={() => setModeOverride('initial')}>
                {pt.clinicalRecord.initialAssessment}
              </ModeButton>
            )}
            <ModeButton active={mode === 'anamnese'} onClick={() => setModeOverride('anamnese')}>
              {pt.clinicalRecord.newAnamnese}
            </ModeButton>
            {hasInitialQuery.data && (
              <>
                <ModeButton active={mode === 'evolution'} onClick={() => setModeOverride('evolution')}>
                  {pt.clinicalRecord.evolution}
                </ModeButton>
                <ModeButton active={mode === 'reassessment'} onClick={() => setModeOverride('reassessment')}>
                  {pt.clinicalRecord.newReassessment}
                </ModeButton>
                <ModeButton active={mode === 'discharge'} onClick={() => setModeOverride('discharge')}>
                  {pt.clinicalRecord.newDischarge}
                </ModeButton>
              </>
            )}
          </div>
        </div>

        {mode === 'initial' && (
          <AssessmentForm
            physiotherapistId={physiotherapistId}
            patientId={patientId}
            appointmentId={appointmentId}
            recordType="initial_assessment"
            defaultValues={assessmentPrefill}
            performedById={performedBy}
            onSuccess={() => setModeOverride('evolution')}
          />
        )}
        {mode === 'reassessment' && (
          <AssessmentForm
            physiotherapistId={physiotherapistId}
            patientId={patientId}
            appointmentId={appointmentId}
            recordType="reassessment"
            defaultValues={assessmentPrefill}
            performedById={performedBy}
            onSuccess={() => setModeOverride('evolution')}
          />
        )}
        {mode === 'evolution' && (
          <EvolutionForm
            physiotherapistId={physiotherapistId}
            patientId={patientId}
            appointmentId={appointmentId}
            assessmentSummary={summaryData}
            performedById={performedBy}
            onSuccess={() => {
              void recordsQuery.refetch()
            }}
          />
        )}
        {mode === 'anamnese' && (
          <AnamneseForm
            physiotherapistId={physiotherapistId}
            patientId={patientId}
            appointmentId={appointmentId}
            performedById={performedBy}
            onSuccess={() => {
              void recordsQuery.refetch()
            }}
          />
        )}
        {mode === 'discharge' && (
          <DischargeForm
            physiotherapistId={physiotherapistId}
            patientId={patientId}
            appointmentId={appointmentId}
            performedById={performedBy}
            responsibleName={responsibleName}
            onSuccess={() => {
              void recordsQuery.refetch()
            }}
          />
        )}
      </TabsContent>

      <TabsContent value="history" className="mt-0">
        {recordsQuery.isLoading ? (
          <LoadingSpinner className="mx-auto h-8 w-8" />
        ) : (
          <ClinicalRecordList records={recordsQuery.data ?? []} />
        )}
      </TabsContent>

      <TabsContent value="comparison" className="mt-0">
        {comparisonQuery.isLoading ? (
          <LoadingSpinner className="mx-auto h-8 w-8" />
        ) : (
          <AssessmentComparison assessments={comparisonQuery.data ?? []} />
        )}
      </TabsContent>
    </Tabs>
  )
}

/** @deprecated Use ClinicalRecordWorkspace — kept as thin re-export for existing imports. */
export { ClinicalRecordWorkspace as ClinicalRecordForm }
