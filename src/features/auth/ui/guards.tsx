import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../hooks/use-auth'
import { getPhysiotherapistByProfileId } from '@/entities/physiotherapist/api/physiotherapist-api'
import { canManagePractice, isPhysioHubPath } from '@/entities/physiotherapist/model/subscription-access'
import { queryKeys } from '@/shared/api/query-keys'
import { LoadingSpinner } from '@/shared/ui/states'
import type { UserRole } from '@/shared/types/database'
import { ROUTES } from '@/shared/config/routes'
import { isPasswordRecovery } from '../lib/password-recovery'

export function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  if (isPasswordRecovery() && location.pathname !== ROUTES.resetPassword) {
    return <Navigate to={ROUTES.resetPassword} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function RoleGuard({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[]
  children?: ReactNode
}) {
  const { profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!profile || !allowedRoles.includes(profile.role)) {
    return <Navigate to={ROUTES.home} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function GuestRoute({ children }: { children?: ReactNode }) {
  const { isAuthenticated, profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (isAuthenticated && profile) {
    if (isPasswordRecovery()) {
      return <Navigate to={ROUTES.resetPassword} replace />
    }

    const routes: Record<UserRole, string> = {
      patient: ROUTES.patient.dashboard,
      physiotherapist: ROUTES.physio.dashboard,
      admin: ROUTES.admin.dashboard,
      caregiver: ROUTES.caregiver.dashboard,
    }
    return <Navigate to={routes[profile.role]} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

export function SubscriptionGuard({ children }: { children?: ReactNode }) {
  const { user, profile, isLoading } = useAuth()
  const location = useLocation()
  const physioQuery = useQuery({
    queryKey: queryKeys.physiotherapist(user?.id ?? ''),
    queryFn: () => getPhysiotherapistByProfileId(user!.id),
    enabled: profile?.role === 'physiotherapist' && !!user?.id,
  })

  if (profile?.role !== 'physiotherapist') {
    return children ? <>{children}</> : <Outlet />
  }

  if (isLoading || physioQuery.isLoading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  const active = physioQuery.data ? canManagePractice(physioQuery.data) : false
  if (active || isPhysioHubPath(location.pathname)) {
    return children ? <>{children}</> : <Outlet />
  }

  return <Navigate to={ROUTES.physio.dashboard} replace />
}
