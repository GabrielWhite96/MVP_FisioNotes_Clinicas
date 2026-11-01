import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClinicalRecord } from '@/entities/clinical-record/api/clinical-record-api'
import { emptyAnamneseData, type AnamneseStructuredData } from '@/entities/clinical-record/model/anamnese-schema'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { Button } from '@/shared/ui/button'
import { Label, Textarea } from '@/shared/ui/input'
import { FormSection } from './fields/form-section'

export function AnamneseForm({
  physiotherapistId,
  patientId,
  appointmentId,
  performedById,
  onSuccess,
}: {
  physiotherapistId: string
  patientId: string
  appointmentId?: string
  performedById?: string | null
  onSuccess?: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit } = useForm<AnamneseStructuredData>({
    defaultValues: emptyAnamneseData(),
  })

  const mutation = useMutation({
    mutationFn: (data: AnamneseStructuredData) =>
      createClinicalRecord({
        appointmentId,
        physiotherapistId,
        patientId,
        recordType: 'anamnese',
        structuredData: data,
        performedById,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinicalRecords(patientId) })
      onSuccess?.()
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{pt.clinicalRecord.anamnese}</h2>
        <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinicalRecord.anamneseHint}</p>
      </div>
      <FormSection step={1} title={pt.clinicalRecord.anamnese} description={pt.clinicalRecord.anamneseHint}>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="chiefComplaint">{pt.clinicalRecord.chiefComplaint}</Label>
            <Textarea id="chiefComplaint" rows={3} {...register('anamnese.chiefComplaint')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hda">{pt.clinicalRecord.hda}</Label>
            <Textarea id="hda" rows={4} {...register('anamnese.currentIllnessHistory')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hpp">{pt.clinicalRecord.hpp}</Label>
            <Textarea id="hpp" rows={3} {...register('anamnese.pastMedicalHistory')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meds">{pt.clinicalRecord.medications}</Label>
            <Textarea id="meds" rows={2} {...register('anamnese.medications')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="surgeries">{pt.clinicalRecord.previousSurgeries}</Label>
            <Textarea id="surgeries" rows={2} {...register('anamnese.previousSurgeries')} />
          </div>
        </div>
      </FormSection>
      <div className="flex justify-end">
        {mutation.error && <p className="mr-auto text-sm text-red-600">{(mutation.error as Error).message}</p>}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? pt.common.loading : pt.clinic.saveAnamnese}
        </Button>
      </div>
    </form>
  )
}
