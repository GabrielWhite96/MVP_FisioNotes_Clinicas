import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { updatePasswordSchema, type UpdatePasswordFormData } from '../model/schemas'
import { getDashboardRoute, getProfile, updatePassword, verifyRecoveryOtp } from '../api/auth-api'
import {
  capturePasswordRecoveryFromUrl,
  clearPasswordRecovery,
  isExpiredAuthCallback,
  markPasswordRecovery,
  parseAuthCallback,
} from '../lib/password-recovery'
import { useAuth } from '../hooks/use-auth'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'
import { LoadingSpinner } from '@/shared/ui/states'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import type { UserRole } from '@/shared/types/database'

function ExpiredLinkCard() {
  return (
    <Card className="mx-0 w-full max-w-none border-0 bg-transparent shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="font-display text-3xl font-semibold tracking-tight">
          {pt.auth.resetLinkExpiredTitle}
        </CardTitle>
        <CardDescription>{pt.auth.resetLinkExpired}</CardDescription>
      </CardHeader>
      <CardContent className="mt-6 p-0">
        <Button asChild className="w-full">
          <Link to={ROUTES.forgotPassword}>{pt.auth.resetPassword}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function ResetPasswordForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { session, profile, isLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [otpExpired, setOtpExpired] = useState(false)
  const linkExpired = otpExpired || isExpiredAuthCallback(parseAuthCallback(location.search, location.hash))
  const [verifying, setVerifying] = useState(false)
  const [codePending, setCodePending] = useState(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).has('code')
  })
  const verifiedRef = useRef(false)
  const { register, handleSubmit, formState: { errors } } = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
  })

  useEffect(() => {
    if (verifiedRef.current || linkExpired) return
    const params = capturePasswordRecoveryFromUrl()
    if (!params.tokenHash || params.type !== 'recovery') return

    verifiedRef.current = true
    setVerifying(true)
    void verifyRecoveryOtp(params.tokenHash)
      .then(() => {
        markPasswordRecovery()
      })
      .catch(() => {
        setOtpExpired(true)
      })
      .finally(() => {
        setVerifying(false)
      })
  }, [linkExpired])

  useEffect(() => {
    if (!codePending) return
    if (session) {
      setCodePending(false)
      return
    }
    const timeoutId = window.setTimeout(() => setCodePending(false), 2500)
    return () => window.clearTimeout(timeoutId)
  }, [codePending, session])

  const mutation = useMutation({
    mutationFn: (data: UpdatePasswordFormData) => updatePassword(data.password),
    onSuccess: async () => {
      clearPasswordRecovery()
      if (profile) {
        navigate(getDashboardRoute(profile.role), { replace: true })
        return
      }
      if (session?.user) {
        const nextProfile = await getProfile(session.user.id)
        navigate(getDashboardRoute(nextProfile.role as UserRole), { replace: true })
        return
      }
      navigate(ROUTES.login, { replace: true })
    },
  })

  if (linkExpired) return <ExpiredLinkCard />
  if (isLoading || verifying || codePending) {
    return <LoadingSpinner className="mx-auto h-8 w-8" />
  }
  if (!session) return <ExpiredLinkCard />

  return (
    <Card className="mx-0 w-full max-w-none border-0 bg-transparent shadow-none">
      <CardHeader className="p-0">
        <CardTitle className="font-display text-3xl font-semibold tracking-tight">
          {pt.auth.updatePasswordTitle}
        </CardTitle>
        <CardDescription>{pt.auth.updatePasswordDescription}</CardDescription>
      </CardHeader>
      <CardContent className="mt-6 p-0">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{pt.auth.newPassword}</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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
            {errors.password && <p className="text-sm text-red-600">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">{pt.auth.confirmPassword}</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
            )}
          </div>
          {mutation.error && <p className="text-sm text-red-600">{mutation.error.message}</p>}
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? pt.common.loading : pt.auth.saveNewPassword}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
