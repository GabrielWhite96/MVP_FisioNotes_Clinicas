import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarWeeks, parseISO } from 'date-fns'
import { getActiveTreatmentPlan } from '@/entities/treatment-plan/api/treatment-plan-api'
import { getAdherenceScore, getLatestCheckIn } from '@/entities/check-in/api/check-in-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState, LoadingSpinner } from '@/shared/ui/states'
import { pt } from '@/shared/config/i18n/pt'

interface RecoveryProgressWidgetProps {
  patientId: string
}

export function RecoveryProgressWidget({ patientId }: RecoveryProgressWidgetProps) {
  const planQuery = useQuery({
    queryKey: queryKeys.activeTreatmentPlan(patientId),
    queryFn: () => getActiveTreatmentPlan(patientId),
    enabled: !!patientId,
  })

  const checkInQuery = useQuery({
    queryKey: queryKeys.latestCheckIn(patientId),
    queryFn: () => getLatestCheckIn(patientId),
    enabled: !!patientId,
  })

  const adherenceQuery = useQuery({
    queryKey: queryKeys.adherence(patientId),
    queryFn: () => getAdherenceScore(patientId, 7),
    enabled: !!patientId,
  })

  if (planQuery.isLoading) return <LoadingSpinner />
  if (!planQuery.data) {
    return <EmptyState title={pt.treatmentPlan.noPlan} description={pt.treatmentPlan.noPlanHint} />
  }

  const plan = planQuery.data
  const elapsed = differenceInCalendarWeeks(new Date(), parseISO(plan.started_at)) + 1
  const currentWeek = Math.min(Math.max(elapsed, 1), plan.duration_weeks)
  const weekPct = Math.round((currentWeek / plan.duration_weeks) * 100)
  const adherence = adherenceQuery.data ?? 0
  const checkIn = checkInQuery.data

  const weekLabel = pt.recovery.weekOf
    .replace('{current}', String(currentWeek))
    .replace('{total}', String(plan.duration_weeks))

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pt.recovery.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{weekLabel}</span>
            <span>{weekPct}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--color-muted)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)]"
              style={{ width: `${weekPct}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{pt.recovery.adherence}</span>
            <span>{adherence}%</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[var(--color-muted)]">
            <div
              className="h-full rounded-full bg-[var(--color-primary)]"
              style={{ width: `${Math.min(100, adherence)}%` }}
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-medium">{pt.recovery.latestMetrics}</p>
          {checkIn ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label={pt.checkIn.pain} value={checkIn.pain_level} />
              <Metric label={pt.checkIn.mobility} value={checkIn.mobility_level} />
              <Metric label={pt.checkIn.confidence} value={checkIn.confidence_level} />
              <Metric label={pt.checkIn.exerciseDifficulty} value={checkIn.exercise_difficulty} />
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">{pt.checkIn.none}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-2xl bg-[var(--color-muted)] p-3 text-center">
      <p className="text-sm text-[var(--color-muted-foreground)]">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums leading-none">{value ?? '—'}</p>
    </div>
  )
}
