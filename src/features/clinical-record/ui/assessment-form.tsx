import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClinicalRecord } from '@/entities/clinical-record/api/clinical-record-api'
import type { AssessmentStructuredData, PhysicalExamFindingKey } from '@/entities/clinical-record/model/assessment-schema'
import { emptyAssessmentData } from '@/entities/clinical-record/model/defaults'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { pt } from '@/shared/config/i18n/pt'
import {
  AUSCULTA_OPTIONS,
  MRC_MUSCLE_GROUPS,
  GONIOMETRY_JOINTS,
  POSTURAL_CHANGE_OPTIONS,
  GAIT_CHANGE_OPTIONS,
  SUPERFICIAL_REFLEX_OPTIONS,
  DEEP_REFLEX_OPTIONS,
  STATIC_BALANCE_OPTIONS,
  DYNAMIC_BALANCE_OPTIONS,
  SPECIAL_TEST_OPTIONS,
  SHORTENING_DEFORMITY_OPTIONS,
  STRENGTH_LOSS_MUSCLE_GROUPS,
  MOBILITY_LOSS_SEGMENTS,
} from '@/entities/clinical-record/model/clinical-options'
import { StatusToggle } from './fields/status-toggle'
import { YesNoDetail } from './fields/yes-no-detail'
import { VitalSignsFields } from './fields/vital-signs-fields'
import { OptionChecklist } from './fields/option-checklist'
import { FormSection } from './fields/form-section'
import { NextEvaluationPicker } from './next-evaluation-picker'
import { useState } from 'react'
import type { ClinicalRecordType } from '@/shared/types/database'

const EXAM_FINDINGS: Array<{ key: PhysicalExamFindingKey; label: string; options: string[] }> = [
  { key: 'ausculta', label: pt.clinicalRecord.ausculta, options: AUSCULTA_OPTIONS },
  { key: 'mrc', label: pt.clinicalRecord.mrc, options: MRC_MUSCLE_GROUPS },
  { key: 'goniometria', label: pt.clinicalRecord.goniometria, options: GONIOMETRY_JOINTS },
  { key: 'posturalChanges', label: pt.clinicalRecord.posturalChanges, options: POSTURAL_CHANGE_OPTIONS },
  { key: 'gaitChanges', label: pt.clinicalRecord.gaitChanges, options: GAIT_CHANGE_OPTIONS },
  { key: 'superficialReflexes', label: pt.clinicalRecord.superficialReflexes, options: SUPERFICIAL_REFLEX_OPTIONS },
  { key: 'deepReflexes', label: pt.clinicalRecord.deepReflexes, options: DEEP_REFLEX_OPTIONS },
  { key: 'staticBalance', label: pt.clinicalRecord.staticBalance, options: STATIC_BALANCE_OPTIONS },
  { key: 'dynamicBalance', label: pt.clinicalRecord.dynamicBalance, options: DYNAMIC_BALANCE_OPTIONS },
  { key: 'specialTests', label: pt.clinicalRecord.specialTests, options: SPECIAL_TEST_OPTIONS },
]

interface AssessmentFormProps {
  physiotherapistId: string
  patientId: string
  appointmentId?: string
  recordType: Extract<ClinicalRecordType, 'initial_assessment' | 'reassessment'>
  defaultValues?: AssessmentStructuredData
  performedById?: string | null
  onSuccess?: () => void
}

export function AssessmentForm({
  physiotherapistId,
  patientId,
  appointmentId,
  recordType,
  defaultValues,
  performedById,
  onSuccess,
}: AssessmentFormProps) {
  const queryClient = useQueryClient()
  const [nextEvaluationAt, setNextEvaluationAt] = useState<string | null>(null)
  const { register, control, handleSubmit, watch, setValue } = useForm<AssessmentStructuredData>({
    defaultValues: defaultValues ?? emptyAssessmentData(),
  })

  const mutation = useMutation({
    mutationFn: (data: AssessmentStructuredData) =>
      createClinicalRecord({
        appointmentId,
        physiotherapistId,
        patientId,
        recordType,
        structuredData: data,
        nextEvaluationAt,
        performedById,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinicalRecords(patientId) })
      onSuccess?.()
    },
  })

  const title =
    recordType === 'initial_assessment'
      ? pt.clinicalRecord.initialAssessment
      : pt.clinicalRecord.reassessment

  return (
    <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {pt.clinicalRecord.assessmentFormHint}
        </p>
      </div>

      <FormSection
        step={1}
        title={pt.clinicalRecord.personalData}
        description={pt.clinicalRecord.personalDataHint}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="fullName">{pt.clinicalRecord.fullName}</Label>
            <Input id="fullName" {...register('personalData.fullName')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">{pt.clinicalRecord.phone}</Label>
            <Input id="phone" {...register('personalData.phone')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="identity">{pt.clinicalRecord.identity}</Label>
            <Input id="identity" placeholder="000.000.000-00" {...register('personalData.identityDocument')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">{pt.clinicalRecord.dateOfBirth}</Label>
            <Input id="dob" type="date" {...register('personalData.dateOfBirth')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addr1">{pt.clinicalRecord.address}</Label>
            <Input id="addr1" {...register('personalData.addressLine1')} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="addr2">{pt.clinicalRecord.addressLine2}</Label>
            <Input id="addr2" {...register('personalData.addressLine2')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="city">{pt.clinicalRecord.city}</Label>
            <Input id="city" {...register('personalData.city')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="province">{pt.clinicalRecord.province}</Label>
            <Input id="province" {...register('personalData.province')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="postal">{pt.clinicalRecord.postalCode}</Label>
            <Input id="postal" {...register('personalData.postalCode')} />
          </div>
        </div>
      </FormSection>

      <FormSection
        step={2}
        title={pt.clinicalRecord.anamnese}
        description={pt.clinicalRecord.anamneseHint}
      >
        <div className="space-y-4">
          {(
            [
              ['anamnese.chiefComplaint', pt.clinicalRecord.chiefComplaint],
              ['anamnese.currentIllnessHistory', pt.clinicalRecord.hda],
              ['anamnese.pastMedicalHistory', pt.clinicalRecord.hpp],
              ['anamnese.medications', pt.clinicalRecord.medications],
              ['anamnese.previousSurgeries', pt.clinicalRecord.previousSurgeries],
            ] as const
          ).map(([name, label]) => (
            <div key={name} className="space-y-1.5">
              <Label htmlFor={name}>{label}</Label>
              <Textarea id={name} rows={2} {...register(name)} />
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        step={3}
        title={pt.clinicalRecord.physicalExam}
        description={pt.clinicalRecord.physicalExamHint}
      >
        <div className="space-y-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4">
          <p className="text-sm font-medium">{pt.clinicalRecord.vitalSigns}</p>
          <Controller
            name="physicalExam.vitals"
            control={control}
            render={({ field }) => (
              <VitalSignsFields value={field.value} onChange={field.onChange} />
            )}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {EXAM_FINDINGS.map(({ key, label, options }) => (
            <div
              key={key}
              className="space-y-3 rounded-lg border border-[var(--color-border)] p-3.5"
            >
              <Controller
                name={`physicalExam.${key}.status`}
                control={control}
                render={({ field }) => (
                  <StatusToggle label={label} value={field.value} onChange={field.onChange} />
                )}
              />
              <OptionChecklist
                options={options}
                selected={watch(`physicalExam.${key}.items`) ?? []}
                onChange={(next) => setValue(`physicalExam.${key}.items`, next)}
              />
              <Textarea
                rows={2}
                placeholder={pt.clinicalRecord.notes}
                {...register(`physicalExam.${key}.notes`)}
              />
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection
        step={4}
        title={pt.clinicalRecord.specificFindings}
        description={pt.clinicalRecord.specificFindingsHint}
      >
        <div className="space-y-4">
          <YesNoDetail
            label={pt.clinicalRecord.shortenings}
            yes={watch('findings.shorteningsDeformities.yes')}
            detail={watch('findings.shorteningsDeformities.detail')}
            onYesChange={(v) => setValue('findings.shorteningsDeformities.yes', v)}
            onDetailChange={(v) => setValue('findings.shorteningsDeformities.detail', v)}
          />
          {watch('findings.shorteningsDeformities.yes') && (
            <OptionChecklist
              options={SHORTENING_DEFORMITY_OPTIONS}
              selected={watch('findings.shorteningsDeformities.items') ?? []}
              onChange={(next) => setValue('findings.shorteningsDeformities.items', next)}
            />
          )}
          <YesNoDetail
            label={pt.clinicalRecord.strengthLoss}
            yes={watch('findings.muscleStrengthLoss.yes')}
            detail={watch('findings.muscleStrengthLoss.detail')}
            detailPlaceholder={pt.clinicalRecord.whichMuscleGroup}
            onYesChange={(v) => setValue('findings.muscleStrengthLoss.yes', v)}
            onDetailChange={(v) => setValue('findings.muscleStrengthLoss.detail', v)}
          />
          {watch('findings.muscleStrengthLoss.yes') && (
            <OptionChecklist
              options={STRENGTH_LOSS_MUSCLE_GROUPS}
              selected={watch('findings.muscleStrengthLoss.items') ?? []}
              onChange={(next) => setValue('findings.muscleStrengthLoss.items', next)}
            />
          )}
          <YesNoDetail
            label={pt.clinicalRecord.mobilityLoss}
            yes={watch('findings.mobilityLoss.yes')}
            detail={watch('findings.mobilityLoss.detail')}
            onYesChange={(v) => setValue('findings.mobilityLoss.yes', v)}
            onDetailChange={(v) => setValue('findings.mobilityLoss.detail', v)}
          />
          {watch('findings.mobilityLoss.yes') && (
            <OptionChecklist
              options={MOBILITY_LOSS_SEGMENTS}
              selected={watch('findings.mobilityLoss.items') ?? []}
              onChange={(next) => setValue('findings.mobilityLoss.items', next)}
            />
          )}
        </div>
      </FormSection>

      <FormSection
        step={5}
        title={pt.clinicalRecord.therapeuticPlan}
        description={pt.clinicalRecord.therapeuticPlanHint}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="shortGoal">{pt.clinicalRecord.shortTermGoal}</Label>
            <Textarea id="shortGoal" rows={3} {...register('therapeuticPlan.shortTermGoal')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longGoal">{pt.clinicalRecord.longTermGoal}</Label>
            <Textarea id="longGoal" rows={3} {...register('therapeuticPlan.longTermGoal')} />
          </div>
        </div>

        <div className="rounded-lg border border-dashed border-[var(--color-border)] p-4">
          <NextEvaluationPicker value={nextEvaluationAt} onChange={setNextEvaluationAt} />
        </div>
      </FormSection>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-2 border-t border-[var(--color-border)] bg-[var(--color-background)]/95 px-1 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        {mutation.error ? (
          <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {pt.clinicalRecord.saveHint}
          </p>
        )}
        <Button type="submit" disabled={mutation.isPending} className="sm:min-w-44">
          {mutation.isPending ? pt.common.loading : pt.clinicalRecord.saveRecord}
        </Button>
      </div>
    </form>
  )
}
