import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  assignPatientTherapist,
  getCurrentPatientAssignment,
  listPatientAssignments,
} from '@/entities/patient-assignment/api/patient-assignment-api'
import { listClinicPhysiotherapists } from '@/entities/clinic-physiotherapist/api/clinic-physiotherapist-api'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import { formatDate } from '@/shared/lib/dates'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input, Label } from '@/shared/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState, LoadingSpinner } from '@/shared/ui/states'

const schema = z.object({
  clinicPhysiotherapistId: z.string().min(1, pt.clinic.responsibleRequired),
  startedOn: z.string().min(1, 'Data obrigatória'),
})

type FormData = z.infer<typeof schema>

export function PatientResponsibleSummary({ patientId }: { patientId: string }) {
  const assignmentQuery = useQuery({
    queryKey: [...queryKeys.patientAssignments(patientId), 'current'],
    queryFn: () => getCurrentPatientAssignment(patientId),
    enabled: !!patientId,
  })

  if (assignmentQuery.isLoading) return <LoadingSpinner className="h-6 w-6" />
  if (!assignmentQuery.data?.clinic_physiotherapists) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinic.noResponsible}</p>
  }

  return (
    <div className="space-y-1">
      <p className="text-lg font-semibold">{assignmentQuery.data.clinic_physiotherapists.full_name}</p>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        {pt.clinic.startDate}: {formatDate(assignmentQuery.data.started_on)}
      </p>
    </div>
  )
}

export function PatientAssignmentPanel({
  patientId,
  practiceId,
  canEdit,
}: {
  patientId: string
  practiceId: string
  canEdit: boolean
}) {
  const queryClient = useQueryClient()
  const staffQuery = useQuery({
    queryKey: queryKeys.clinicPhysiotherapists(practiceId),
    queryFn: () => listClinicPhysiotherapists(practiceId, { activeOnly: true }),
    enabled: !!practiceId,
  })
  const historyQuery = useQuery({
    queryKey: queryKeys.patientAssignments(patientId),
    queryFn: () => listPatientAssignments(patientId),
    enabled: !!patientId,
  })

  const current = (historyQuery.data ?? []).find((item) => !item.ended_on) ?? null
  const { register, setValue, watch, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      clinicPhysiotherapistId: '',
      startedOn: new Date().toISOString().slice(0, 10),
    },
  })

  const mutation = useMutation({
    mutationFn: (data: FormData) => assignPatientTherapist({
      patientId,
      clinicPhysiotherapistId: data.clinicPhysiotherapistId,
      startedOn: data.startedOn,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.patientAssignments(patientId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.physioPatients(practiceId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.patientDetail(patientId) })
    },
  })

  const activeStaff = (staffQuery.data ?? []).filter((staff) => staff.id !== current?.clinic_physiotherapist_id)

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pt.clinic.currentResponsible}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {historyQuery.isLoading ? (
            <LoadingSpinner />
          ) : current?.clinic_physiotherapists ? (
            <div className="space-y-1">
              <p className="font-medium">{current.clinic_physiotherapists.full_name}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {pt.clinic.startDate}: {formatDate(current.started_on)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinic.noResponsible}</p>
          )}
          <Button asChild variant="outline" size="sm">
            <Link to={ROUTES.physio.patientAssignmentReport(patientId)}>{pt.clinic.patientLinksReport}</Link>
          </Button>
        </CardContent>
      </Card>

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{pt.clinic.changeResponsible}</CardTitle>
          </CardHeader>
          <CardContent>
            {!staffQuery.data?.length ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {pt.clinic.noStaffForPatient}{' '}
                <Link to={ROUTES.physio.staffNew} className="text-[var(--color-primary)] hover:underline">
                  {pt.clinic.newStaff}
                </Link>
              </p>
            ) : (
              <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                <div className="space-y-2">
                  <Label>{pt.clinic.responsible}</Label>
                  <Select
                    value={watch('clinicPhysiotherapistId') || undefined}
                    onValueChange={(value) => setValue('clinicPhysiotherapistId', value, { shouldValidate: true })}
                  >
                    <SelectTrigger><SelectValue placeholder={pt.common.select} /></SelectTrigger>
                    <SelectContent>
                      {activeStaff.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>{staff.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.clinicPhysiotherapistId && (
                    <p className="text-sm text-red-600">{errors.clinicPhysiotherapistId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{pt.clinic.startDate}</Label>
                  <Input type="date" {...register('startedOn')} />
                </div>
                {mutation.error && <p className="text-sm text-red-600">{(mutation.error as Error).message}</p>}
                <Button type="submit" disabled={mutation.isPending || !activeStaff.length}>
                  {mutation.isPending ? pt.common.loading : pt.clinic.assign}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pt.clinic.assignmentHistory}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!historyQuery.data?.length && !historyQuery.isLoading && (
            <EmptyState title={pt.clinic.emptyAssignments} description={pt.clinic.emptyAssignmentsHint} />
          )}
          {(historyQuery.data ?? []).map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium">{assignment.clinic_physiotherapists?.full_name ?? '—'}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatDate(assignment.started_on)}
                  {' — '}
                  {assignment.ended_on ? formatDate(assignment.ended_on) : pt.clinic.ongoing}
                </p>
              </div>
              {!assignment.ended_on && <Badge variant="success">{pt.clinic.currentPeriod}</Badge>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
