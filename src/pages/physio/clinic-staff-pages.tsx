import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, UserPlus } from 'lucide-react'
import { getPhysiotherapistByProfileId } from '@/entities/physiotherapist/api/physiotherapist-api'
import { canManagePractice } from '@/entities/physiotherapist/model/subscription-access'
import {
  getClinicPhysiotherapistById,
  listClinicPhysiotherapists,
} from '@/entities/clinic-physiotherapist/api/clinic-physiotherapist-api'
import { listStaffAssignments } from '@/entities/patient-assignment/api/patient-assignment-api'
import { ClinicPhysiotherapistForm } from '@/features/clinic-physiotherapists/ui/clinic-physiotherapist-form'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { queryKeys } from '@/shared/api/query-keys'
import { pt } from '@/shared/config/i18n/pt'
import { CLINICAL_STATUS_LABELS, ROUTES } from '@/shared/config/routes'
import { formatDate } from '@/shared/lib/dates'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Input } from '@/shared/ui/input'
import { EmptyState, ErrorState, LoadingSpinner } from '@/shared/ui/states'

export function PhysioStaffPage() {
  const { user } = useAuth()
  const [search, setSearch] = useState('')
  const physioQuery = useQuery({
    queryKey: queryKeys.physiotherapist(user?.id ?? ''),
    queryFn: () => getPhysiotherapistByProfileId(user!.id),
    enabled: !!user?.id,
  })
  const staffQuery = useQuery({
    queryKey: queryKeys.clinicPhysiotherapists(physioQuery.data?.id ?? ''),
    queryFn: () => listClinicPhysiotherapists(physioQuery.data!.id),
    enabled: !!physioQuery.data?.id,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (staffQuery.data ?? []).filter((staff) => {
      if (!q) return true
      return (
        staff.full_name.toLowerCase().includes(q) ||
        (staff.email ?? '').toLowerCase().includes(q) ||
        (staff.license_number ?? '').toLowerCase().includes(q)
      )
    })
  }, [staffQuery.data, search])

  const practiceOpen = !physioQuery.data || canManagePractice(physioQuery.data)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{pt.clinic.staff}</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{pt.clinic.staffSubtitle}</p>
        </div>
        <Button asChild={practiceOpen} disabled={!practiceOpen}>
          {practiceOpen ? (
            <Link to={ROUTES.physio.staffNew}>
              <UserPlus className="mr-2 h-4 w-4" />
              {pt.clinic.newStaff}
            </Link>
          ) : (
            <span>
              <UserPlus className="mr-2 h-4 w-4" />
              {pt.clinic.newStaff}
            </span>
          )}
        </Button>
      </div>
      <Input
        placeholder={pt.clinic.searchStaff}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {staffQuery.isLoading && <LoadingSpinner />}
      {!filtered.length && !staffQuery.isLoading && (
        <EmptyState title={pt.clinic.emptyStaff} description={pt.clinic.emptyStaffHint} />
      )}
      <div className="space-y-3">
        {filtered.map((staff) => (
          <Link
            key={staff.id}
            to={ROUTES.physio.staffDetail(staff.id)}
            className="flex items-center justify-between rounded-lg border p-4 hover:bg-[var(--color-accent)]"
          >
            <div className="space-y-1">
              <p className="font-medium">{staff.full_name}</p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {[staff.license_number, staff.email, staff.phone].filter(Boolean).join(' · ') || '—'}
              </p>
              <Badge variant={staff.is_active ? 'success' : 'outline'}>
                {staff.is_active ? pt.clinic.active : pt.clinic.inactive}
              </Badge>
            </div>
            <ChevronRight className="h-5 w-5" />
          </Link>
        ))}
      </div>
    </div>
  )
}

export function PhysioStaffNewPage() {
  const { user } = useAuth()
  const physioQuery = useQuery({
    queryKey: queryKeys.physiotherapist(user?.id ?? ''),
    queryFn: () => getPhysiotherapistByProfileId(user!.id),
    enabled: !!user?.id,
  })

  if (!physioQuery.data) {
    return <LoadingSpinner className="mx-auto mt-8 h-8 w-8" />
  }

  if (!canManagePractice(physioQuery.data)) {
    return <p className="text-sm text-[var(--color-muted-foreground)]">{pt.saas.locked}</p>
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="page-title">{pt.clinic.newStaff}</h1>
      <ClinicPhysiotherapistForm practiceId={physioQuery.data.id} />
    </div>
  )
}

export function PhysioStaffDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const physioQuery = useQuery({
    queryKey: queryKeys.physiotherapist(user?.id ?? ''),
    queryFn: () => getPhysiotherapistByProfileId(user!.id),
    enabled: !!user?.id,
  })
  const staffQuery = useQuery({
    queryKey: queryKeys.clinicPhysiotherapist(id ?? ''),
    queryFn: () => getClinicPhysiotherapistById(id!),
    enabled: !!id,
  })
  const assignmentsQuery = useQuery({
    queryKey: queryKeys.staffAssignments(id ?? ''),
    queryFn: () => listStaffAssignments(id!),
    enabled: !!id,
  })

  if (!physioQuery.data || staffQuery.isLoading) {
    return <LoadingSpinner className="mx-auto mt-8 h-8 w-8" />
  }
  if (!staffQuery.data) {
    return <ErrorState message="Fisioterapeuta não encontrado" />
  }

  const staff = staffQuery.data
  const practiceOpen = canManagePractice(physioQuery.data)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="page-title">{staff.full_name}</h1>
          <Badge variant={staff.is_active ? 'success' : 'outline'}>
            {staff.is_active ? pt.clinic.active : pt.clinic.inactive}
          </Badge>
        </div>
        <Button asChild variant="outline">
          <Link to={ROUTES.physio.staffAssignmentReport(staff.id)}>{pt.clinic.staffLinksReport}</Link>
        </Button>
      </div>

      {practiceOpen ? (
        <ClinicPhysiotherapistForm practiceId={physioQuery.data.id} staff={staff} />
      ) : (
        <p className="text-sm text-[var(--color-muted-foreground)]">{pt.saas.locked}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{pt.clinic.patientsAttended}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {assignmentsQuery.isLoading && <LoadingSpinner />}
          {!assignmentsQuery.data?.length && !assignmentsQuery.isLoading && (
            <p className="text-sm text-[var(--color-muted-foreground)]">{pt.clinic.emptyAssignments}</p>
          )}
          {(assignmentsQuery.data ?? []).map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
              <div>
                <p className="font-medium">{assignment.patients?.full_name ?? 'Paciente'}</p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {formatDate(assignment.started_on)}
                  {' — '}
                  {assignment.ended_on ? formatDate(assignment.ended_on) : pt.clinic.ongoing}
                </p>
              </div>
              {assignment.patients && (
                <Badge variant="secondary">
                  {CLINICAL_STATUS_LABELS[assignment.patients.clinical_status]}
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
