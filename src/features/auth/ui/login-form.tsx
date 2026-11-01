import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { loginSchema, type LoginFormData } from '../model/schemas'
import { signIn, getDashboardRoute, getProfile } from '../api/auth-api'
import { isExpiredAuthCallback, parseAuthCallback } from '../lib/password-recovery'
import { supabase } from '@/shared/api/supabase'
import { useAuth } from '../hooks/use-auth'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

export function LoginForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const linkError = isExpiredAuthCallback(parseAuthCallback(location.search, location.hash))
    ? pt.auth.resetLinkExpired
    : null
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        const p = await getProfile(session.user.id)
        navigate(getDashboardRoute(p.role as import('@/shared/types/database').UserRole))
      } else if (profile) {
        navigate(getDashboardRoute(profile.role))
      }
    },
  })

  return (
    <div className="w-full">
      <h2 className="font-display text-3xl font-semibold tracking-tight">{pt.auth.login}</h2>
      {linkError ? (
        <div className="mt-4 space-y-1 text-sm text-[var(--color-destructive)]">
          <p>{linkError}</p>
          <Link
            to={ROUTES.forgotPassword}
            className="inline-block font-bold text-[var(--color-primary)] underline-offset-4 hover:underline"
          >
            {pt.auth.resetPassword}
          </Link>
        </div>
      ) : null}
      <form
        onSubmit={handleSubmit((d) => mutation.mutate(d))}
        className="mt-8 flex flex-col gap-5"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{pt.auth.email}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            spellCheck={false}
            {...register('email')}
          />
          {errors.email && <p className="text-sm text-[var(--color-destructive)]">{errors.email.message}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{pt.auth.password}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="pr-12"
              {...register('password')}
            />
            <button
              type="button"
              data-compact
              className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? pt.auth.hidePassword : pt.auth.showPassword}
            >
              {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-[var(--color-destructive)]">{errors.password.message}</p>
          )}
        </div>
        {mutation.error && (
          <p className="text-sm text-[var(--color-destructive)]">{mutation.error.message}</p>
        )}
        <Button type="submit" size="lg" className="mt-1 w-full" disabled={mutation.isPending}>
          {mutation.isPending ? pt.common.loading : pt.auth.login}
        </Button>
        <div className="flex flex-col gap-2 pt-1 text-sm">
          <Link
            to={ROUTES.forgotPassword}
            className="text-[var(--color-muted-foreground)] underline-offset-4 hover:text-[var(--color-foreground)] hover:underline"
          >
            {pt.auth.forgotPassword}
          </Link>
          <span className="text-[var(--color-muted-foreground)]">
            {pt.auth.noAccount}{' '}
            <Link
              to={ROUTES.subscribe}
              className="font-bold text-[var(--color-primary)] underline-offset-4 hover:underline"
            >
              {pt.auth.subscribeCta}
            </Link>
          </span>
        </div>
      </form>
    </div>
  )
}
