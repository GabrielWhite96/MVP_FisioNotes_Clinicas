import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { getDashboardRoute } from '@/features/auth/api/auth-api'
import { LandingPage } from '@/pages/landing/landing-page'
import { LoadingSpinner } from '@/shared/ui/states'
import { ROUTES } from '@/shared/config/routes'

export function HomePage() {
  const { isAuthenticated, profile, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner className="h-8 w-8" />
      </div>
    )
  }

  if (isAuthenticated && profile) {
    return <Navigate to={getDashboardRoute(profile.role)} replace />
  }

  return <LandingPage />
}

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-[var(--color-muted-foreground)]">Página não encontrada</p>
      <a href={ROUTES.home} className="text-[var(--color-primary)] hover:underline">
        Voltar ao início
      </a>
    </div>
  )
}
