import { useQuery } from '@tanstack/react-query'
import { getActiveTreatmentPlan, getTreatmentGoals } from '@/entities/treatment-plan/api/treatment-plan-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { EmptyState, LoadingSpinner } from '@/shared/ui/states'
import { GOAL_METRIC_LABELS } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { differenceInCalendarWeeks, parseISO } from 'date-fns'

function goalProgress(current: number | null, target: number | null): number {
  if (target == null || target <= 0) return 0
  return Math.min(100, Math.round(((current ?? 0) / target) * 100))
}

const STATUS_LABELS: Record<string, string> = {
  active: pt.treatmentPlan.active,
  completed: pt.treatmentPlan.completed,
  paused: pt.treatmentPlan.paused,
  discharged: 'Alta',
}

interface TreatmentPlanCardProps {
  patientId: string
}

export function TreatmentPlanCard({ patientId }: TreatmentPlanCardProps) {
  const planQuery = useQuery({
    queryKey: queryKeys.activeTreatmentPlan(patientId),
    queryFn: () => getActiveTreatmentPlan(patientId),
    enabled: !!patientId,
  })

  const goalsQuery = useQuery({
    queryKey: queryKeys.treatmentGoals(planQuery.data?.id ?? ''),
    queryFn: () => getTreatmentGoals(planQuery.data!.id),
    enabled: !!planQuery.data?.id,
  })

  if (planQuery.isLoading) return <LoadingSpinner />
  if (!planQuery.data) {
    return <EmptyState title={pt.treatmentPlan.noPlan} description={pt.treatmentPlan.noPlanHint} />
  }

  const plan = planQuery.data
  const elapsed = differenceInCalendarWeeks(new Date(), parseISO(plan.started_at)) + 1
  const currentWeek = Math.min(Math.max(elapsed, 1), plan.duration_weeks)

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle>{pt.treatmentPlan.title}</CardTitle>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{plan.primary_goal}</p>
        </div>
        <Badge variant="success">{STATUS_LABELS[plan.status] ?? plan.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {plan.condition && (
          <p className="text-sm">
            <span className="font-medium">{pt.treatmentPlan.condition}: </span>
            {plan.condition}
          </p>
        )}
        <p className="text-sm">
          {pt.treatmentPlan.weekOf} {currentWeek} {pt.treatmentPlan.of} {plan.duration_weeks} · {plan.frequency}
        </p>
        <div>
          <p className="mb-2 text-sm font-medium">{pt.treatmentPlan.progress}</p>
          <div className="space-y-3">
            {goalsQuery.data?.map((goal) => {
              const pct = goalProgress(goal.current_value, goal.target_value)
              return (
                <div key={goal.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span>{goal.title}</span>
                    <span className="text-[var(--color-muted-foreground)]">
                      {goal.current_value ?? 0}
                      {goal.target_value != null ? ` / ${goal.target_value}` : ''}
                      {goal.unit ? ` ${goal.unit}` : ''}
                      {' · '}
                      {GOAL_METRIC_LABELS[goal.metric_type] ?? goal.metric_type}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-primary)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
