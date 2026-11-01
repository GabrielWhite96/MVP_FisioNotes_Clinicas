import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClinicalRecord } from '@/entities/clinical-record/api/clinical-record-api'
import { emptyDischargeData, type DischargeStructuredData } from '@/entities/clinical-record/model/discharge-schema'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { Button } from '@/shared/ui/button'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { FormSection } from './fields/form-section'

export function DischargeForm({
  physiotherapistId,
  patientId,
  appointmentId,
  performedById,
  responsibleName,
  onSuccess,
}: {
  physiotherapistId: string
  patientId: string
  appointmentId?: string
  performedById?: string | null
  responsibleName?: string
  onSuccess?: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit } = useForm<DischargeStructuredData>({
    defaultValues: emptyDischargeData({
      dischargeDate: new Date().toISOString().slice(0, 10),
      responsibleName: responsibleName ?? '',
    }),
  })

  const mutation = useMutation({
    mutationFn: (data: DischargeStructuredData) =>
      createClinicalRecord({
        appointmentId,
        physiotherapistId,
        patientId,
        recordType: 'discharge',
        structuredData: data,
        performedById,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinicalRecords(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.patientDetail(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.activeTreatmentPlan(patientId) })
      onSuccess?.()
    },
  })

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold tracking-tight">{pt.clinicalRecord.discharge}</h2>
      </div>
      <FormSection step={1} title={pt.clinicalRecord.discharge}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="dischargeDate">{pt.clinic.dischargeDate}</Label>
            <Input id="dischargeDate" type="date" {...register('dischargeDate')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="responsibleName">{pt.clinic.dischargeResponsible}</Label>
            <Input id="responsibleName" {...register('responsibleName')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="treatmentSummary">{pt.clinic.treatmentSummary}</Label>
          <Textarea id="treatmentSummary" rows={4} {...register('treatmentSummary')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="conducts">{pt.clinic.dischargeConducts}</Label>
          <Textarea id="conducts" rows={3} {...register('conducts')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="guidelines">{pt.clinic.dischargeGuidelines}</Label>
          <Textarea id="guidelines" rows={3} {...register('guidelines')} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="destination">{pt.clinic.dischargeDestination}</Label>
          <Textarea id="destination" rows={2} {...register('destination')} />
        </div>
      </FormSection>
      <div className="flex justify-end">
        {mutation.error && <p className="mr-auto text-sm text-red-600">{(mutation.error as Error).message}</p>}
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? pt.common.loading : pt.clinic.saveDischarge}
        </Button>
      </div>
    </form>
  )
}
