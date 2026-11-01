import { useQuery } from '@tanstack/react-query'
import { Calendar, ClipboardList, Dumbbell, HeartPulse } from 'lucide-react'
import { getPatientTimeline } from '@/entities/timeline/api/timeline-api'
import type { TimelineEventType } from '@/entities/timeline/api/timeline-api'
import { queryKeys } from '@/shared/api/query-keys'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState, LoadingSpinner } from '@/shared/ui/states'
import { formatDateTime } from '@/shared/lib/dates'
import { pt } from '@/shared/config/i18n/pt'

const EVENT_ICONS: Record<TimelineEventType, typeof Calendar> = {
  clinical_record: ClipboardList,
  appointment: Calendar,
  exercise_completion: Dumbbell,
  check_in: HeartPulse,
}

const EVENT_LABELS: Record<TimelineEventType, string> = {
  clinical_record: pt.timeline.clinical_record,
  appointment: pt.timeline.appointment,
  exercise_completion: pt.timeline.exercise_completion,
  check_in: pt.timeline.check_in,
}

interface ClinicalTimelineProps {
  patientId: string
}

export function ClinicalTimeline({ patientId }: ClinicalTimelineProps) {
  const query = useQuery({
    queryKey: queryKeys.patientTimeline(patientId),
    queryFn: () => getPatientTimeline(patientId),
    enabled: !!patientId,
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{pt.timeline.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading && <LoadingSpinner />}
        {!query.isLoading && !query.data?.length && (
          <EmptyState title={pt.timeline.empty} />
        )}
        <ol className="relative space-y-0 border-l border-[var(--color-border)] pl-6">
          {query.data?.map((event) => {
            const Icon = EVENT_ICONS[event.event_type] ?? ClipboardList
            return (
              <li key={`${event.event_type}-${event.entity_id}`} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[31px] flex h-8 w-8 items-center justify-center rounded-full border bg-[var(--color-card)]">
                  <Icon className="h-4 w-4 text-[var(--color-primary)]" />
                </span>
                <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  {EVENT_LABELS[event.event_type] ?? event.event_type}
                </p>
                <p className="font-medium">{event.title}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">{formatDateTime(event.event_at)}</p>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}
