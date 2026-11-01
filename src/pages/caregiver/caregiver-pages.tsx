import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getCaregiverLinksForCaregiver } from '@/entities/caregiver/api/caregiver-api'
import {
  acceptCaregiverInvite,
  getPendingInvitesForEmail,
} from '@/entities/caregiver/api/caregiver-invite-api'
import { getAppointments } from '@/entities/appointment/api/appointment-api'
import { RecoveryProgressWidget } from '@/widgets/recovery-progress/recovery-progress-widget'
import { TreatmentPlanCard } from '@/features/treatment-plan/ui/treatment-plan-card'
import { PatientExerciseList } from '@/features/exercises/ui/exercise-components'
import { queryKeys } from '@/shared/api/query-keys'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select'
import { EmptyState, LoadingSpinner } from '@/shared/ui/states'
import { pt } from '@/shared/config/i18n/pt'
import { APPOINTMENT_STATUS_LABELS, MODALITY_LABELS } from '@/shared/config/routes'
import { formatDateTime, isUpcoming } from '@/shared/lib/dates'

export function CaregiverDashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const email = user?.email ?? ''

  const linksQuery = useQuery({
    queryKey: queryKeys.caregiverPatients(user?.id ?? ''),
    queryFn: () => getCaregiverLinksForCaregiver(user!.id),
    enabled: !!user?.id,
  })

  const invitesQuery = useQuery({
    queryKey: queryKeys.pendingCaregiverInvites(email),
    queryFn: () => getPendingInvitesForEmail(email),
    enabled: !!email,
  })

  const acceptMutation = useMutation({
    mutationFn: (inviteId: string) => acceptCaregiverInvite(inviteId, user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.caregiverPatients(user!.id) })
      queryClient.invalidateQueries({ queryKey: queryKeys.pendingCaregiverInvites(email) })
    },
  })

  const links = linksQuery.data ?? []
  const activePatientId = selectedPatientId || links[0]?.patient_id || ''
  const activeLink = useMemo(
    () => links.find((l) => l.patient_id === activePatientId) ?? links[0],
    [links, activePatientId]
  )
  const permissions = activeLink?.permissions

  const appointmentsQuery = useQuery({
    queryKey: queryKeys.appointments({ patientId: activePatientId, role: 'caregiver' }),
    queryFn: () => getAppointments({ patientId: activePatientId }),
    enabled: !!activePatientId && !!permissions?.view_appointments,
  })

  const upcoming = appointmentsQuery.data?.filter(
    (a) => isUpcoming(a.scheduled_at) && !['cancelled', 'completed', 'no_show'].includes(a.status)
  ) ?? []

  const patientName = activeLink?.patient?.profiles?.full_name ?? 'Paciente'

  return (
    
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="page-title">{pt.caregiver.dashboard}</h1>
            <p className="page-kicker">{pt.caregiver.readOnly}</p>
          </div>
          {links.length > 1 && (
            <Select value={activePatientId} onValueChange={setSelectedPatientId}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Paciente" />
              </SelectTrigger>
              <SelectContent>
                {links.map((link) => (
                  <SelectItem key={link.id} value={link.patient_id}>
                    {link.patient?.profiles?.full_name ?? link.patient_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {!!invitesQuery.data?.length && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Convites pendentes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {invitesQuery.data.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">Convite de acompanhamento</p>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      Expira {formatDateTime(invite.expires_at)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => acceptMutation.mutate(invite.id)}
                    disabled={acceptMutation.isPending}
                  >
                    Aceitar
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {linksQuery.isLoading && <LoadingSpinner />}
        {!linksQuery.isLoading && links.length === 0 && !invitesQuery.data?.length && (
          <EmptyState title={pt.caregiver.noPatients} description={pt.caregiver.noPatientsHint} />
        )}

        {activeLink && (
          <>
            <p className="text-lg font-medium">{patientName}</p>
            {permissions?.view_progress && (
              <div className="grid gap-6 lg:grid-cols-2">
                <RecoveryProgressWidget patientId={activePatientId} />
                <TreatmentPlanCard patientId={activePatientId} />
              </div>
            )}
            {permissions?.view_appointments && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{pt.caregiver.appointments}</CardTitle>
                  <Badge variant="secondary">{pt.caregiver.readOnly}</Badge>
                </CardHeader>
                <CardContent>
                  {appointmentsQuery.isLoading && <LoadingSpinner />}
                  {!upcoming.length && !appointmentsQuery.isLoading && (
                    <p className="text-sm text-[var(--color-muted-foreground)]">Nenhuma consulta agendada</p>
                  )}
                  <div className="space-y-3">
                    {upcoming.map((a) => (
                      <div key={a.id} className="rounded-lg border p-4">
                        <p className="font-medium">{formatDateTime(a.scheduled_at)}</p>
                        <div className="mt-1 flex gap-2">
                          <Badge variant="secondary">{MODALITY_LABELS[a.modality]}</Badge>
                          <Badge variant="outline">{APPOINTMENT_STATUS_LABELS[a.status]}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {permissions?.view_exercises && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>{pt.caregiver.exercises}</CardTitle>
                  <Badge variant="secondary">{pt.caregiver.readOnly}</Badge>
                </CardHeader>
                <CardContent>
                  <PatientExerciseList patientId={activePatientId} />
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    
  )
}
