import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createClinicalRecord,
  getLatestEvolution,
} from '@/entities/clinical-record/api/clinical-record-api'
import type { AssessmentStructuredData } from '@/entities/clinical-record/model/assessment-schema'
import type { EvolutionStructuredData } from '@/entities/clinical-record/model/evolution-schema'
import { emptyEvolutionData } from '@/entities/clinical-record/model/defaults'
import { formatSessionConductsText } from '@/entities/clinical-record/model/summaries'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Label, Textarea } from '@/shared/ui/input'
import { pt } from '@/shared/config/i18n/pt'
import { VitalSignsFields } from './fields/vital-signs-fields'
import { AssessmentSummaryPanel } from './assessment-summary-panel'

interface EvolutionFormProps {
  physiotherapistId: string
  patientId: string
  appointmentId?: string
  assessmentSummary: AssessmentStructuredData | null
  performedById?: string | null
  onSuccess?: () => void
}

function asEvolutionStructured(raw: unknown): EvolutionStructuredData | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as EvolutionStructuredData
  if (!data.vitals) return null
  if (!('sessionConducts' in data) && !('performed' in data)) return null
  return data
}

export function EvolutionForm({
  physiotherapistId,
  patientId,
  appointmentId,
  assessmentSummary,
  performedById,
  onSuccess,
}: EvolutionFormProps) {
  const queryClient = useQueryClient()
  const prefilledRef = useRef(false)
  const [wasPrefilled, setWasPrefilled] = useState(false)
  const { control, handleSubmit, setValue, watch } = useForm<EvolutionStructuredData>({
    defaultValues: emptyEvolutionData(),
  })

  const sessionConducts = watch('sessionConducts') ?? ''

  const lastEvolutionQuery = useQuery({
    queryKey: [...queryKeys.clinicalRecords(patientId), 'latest-evolution'],
    queryFn: () => getLatestEvolution(patientId),
  })

  useEffect(() => {
    if (prefilledRef.current || lastEvolutionQuery.isLoading) return
    const record = lastEvolutionQuery.data
    if (!record) {
      prefilledRef.current = true
      return
    }
    const structured = asEvolutionStructured(record.structured_data)
    if (!structured) {
      prefilledRef.current = true
      return
    }
    const text = formatSessionConductsText(structured)
    if (text) {
      setValue('sessionConducts', text)
      setWasPrefilled(true)
    }
    prefilledRef.current = true
  }, [lastEvolutionQuery.data, lastEvolutionQuery.isLoading, setValue])

  const mutation = useMutation({
    mutationFn: (data: EvolutionStructuredData) =>
      createClinicalRecord({
        appointmentId,
        physiotherapistId,
        patientId,
        recordType: 'evolution',
        structuredData: data,
        performedById,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clinicalRecords(patientId) })
      onSuccess?.()
    },
  })

  const clearSessionConducts = () => {
    setValue('sessionConducts', '', { shouldDirty: true })
    setWasPrefilled(false)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="order-2 space-y-4 lg:order-1">
        <Card>
          <CardHeader>
            <CardTitle>{pt.clinicalRecord.evolution}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-6">
              <section className="space-y-2">
                <Label>{pt.clinicalRecord.vitalSigns}</Label>
                <Controller
                  name="vitals"
                  control={control}
                  render={({ field }) => (
                    <VitalSignsFields value={field.value} onChange={field.onChange} />
                  )}
                />
              </section>

              <section className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor="evo-session-conducts">{pt.clinicalRecord.sessionConducts}</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={!sessionConducts.trim()}
                    onClick={clearSessionConducts}
                  >
                    {pt.clinicalRecord.clearText}
                  </Button>
                </div>
                {wasPrefilled && sessionConducts.trim() && (
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {pt.clinicalRecord.sessionConductsPrefillHint}
                  </p>
                )}
                <Controller
                  name="sessionConducts"
                  control={control}
                  render={({ field }) => (
                    <Textarea
                      id="evo-session-conducts"
                      rows={10}
                      className="min-h-[200px] resize-y"
                      placeholder={pt.clinicalRecord.sessionConductsPlaceholder}
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </section>

              <details className="group rounded-md border border-[var(--color-border)] p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  {pt.clinicalRecord.generalObservationsOptional}
                </summary>
                <div className="mt-2">
                  <Controller
                    name="observations"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        id="evo-obs"
                        rows={2}
                        placeholder={pt.clinicalRecord.optionalObservation}
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>
              </details>

              {mutation.error && (
                <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>
              )}
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? pt.common.loading : pt.clinicalRecord.saveRecord}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <div className="order-1 lg:order-2">
        <AssessmentSummaryPanel data={assessmentSummary} sticky />
      </div>
    </div>
  )
}
