import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  dischargeTreatmentPlan,
  getActiveTreatmentPlan,
} from '@/entities/treatment-plan/api/treatment-plan-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Button } from '@/shared/ui/button'

export function DischargePlanButton({ patientId }: { patientId: string }) {
  const queryClient = useQueryClient()
  const planQuery = useQuery({
    queryKey: queryKeys.activeTreatmentPlan(patientId),
    queryFn: () => getActiveTreatmentPlan(patientId),
    enabled: !!patientId,
  })

  const mutation = useMutation({
    mutationFn: () => dischargeTreatmentPlan(planQuery.data!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeTreatmentPlan(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.treatmentPlans(patientId) })
      queryClient.invalidateQueries({ queryKey: ['physio-patient-stats'] })
    },
  })

  if (!planQuery.data) return null

  return (
    <Button
      variant="outline"
      onClick={() => {
        if (window.confirm('Registrar alta deste plano de tratamento?')) {
          mutation.mutate()
        }
      }}
      disabled={mutation.isPending}
    >
      Registrar alta (discharge)
    </Button>
  )
}
