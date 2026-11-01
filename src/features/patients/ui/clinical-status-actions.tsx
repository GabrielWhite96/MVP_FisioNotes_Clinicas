import { useMutation, useQueryClient } from '@tanstack/react-query'
import { updatePatientClinicalStatus } from '@/entities/patient/api/patient-api'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { Button } from '@/shared/ui/button'
import type { PatientClinicalStatus } from '@/shared/types/database'

export function ClinicalStatusActions({
  patientId,
  physiotherapistId,
  status,
}: {
  patientId: string
  physiotherapistId: string
  status: PatientClinicalStatus
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (next: PatientClinicalStatus) => updatePatientClinicalStatus(patientId, next),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.patientDetail(patientId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.physioPatients(physiotherapistId) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.physioPatientStats(physiotherapistId) })
    },
  })

  const canPause = status === 'in_treatment' || status === 'reassessment'
  const canResume = status === 'paused'
  const canReturn = status === 'reassessment'

  if (!canPause && !canResume && !canReturn) return null

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {canPause && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('paused')}
        >
          {pt.physio.pauseTreatment}
        </Button>
      )}
      {canResume && (
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('in_treatment')}
        >
          {pt.physio.resumeTreatment}
        </Button>
      )}
      {canReturn && (
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate('in_treatment')}
        >
          {pt.physio.returnToTreatment}
        </Button>
      )}
      {mutation.error && (
        <p className="w-full text-sm text-red-600">{(mutation.error as Error).message}</p>
      )}
    </div>
  )
}
