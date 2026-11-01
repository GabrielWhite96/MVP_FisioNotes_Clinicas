import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { LoginForm } from '@/features/auth/ui/login-form'
import { SubscribeForm } from '@/features/auth/ui/subscribe-form'
import { ForgotPasswordForm } from '@/features/auth/ui/forgot-password-form'
import { ResetPasswordForm } from '@/features/auth/ui/reset-password-form'
import { InviteAcceptForm } from '@/features/auth/ui/invite-accept-form'
import { CaregiverSignupForm } from '@/features/auth/ui/caregiver-signup-form'
import { BrandMark } from '@/shared/ui/brand'
import { MotionArc } from '@/shared/ui/motion-arc'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'

function AuthLayout({ children }: { children: ReactNode }) {
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const shell = shellRef.current
    if (!shell) return
    const syncPause = () => {
      shell.classList.toggle('is-paused', document.hidden)
    }
    syncPause()
    document.addEventListener('visibilitychange', syncPause)
    return () => document.removeEventListener('visibilitychange', syncPause)
  }, [])

  return (
    <div
      ref={shellRef}
      className="studio-field auth-shell relative min-h-dvh w-full overflow-x-hidden overflow-y-auto text-[var(--color-ink-foreground)]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <span className="auth-arc auth-arc-a absolute -left-28 top-[-7rem] block w-[26rem] opacity-[0.18] lg:w-[36rem]">
          <MotionArc className="block w-full rotate-180" />
        </span>
        <span className="auth-arc auth-arc-b absolute top-[12%] right-[36%] hidden w-[16rem] text-[var(--color-primary)] opacity-40 lg:block">
          <MotionArc className="block w-full" />
        </span>
        <span className="auth-arc auth-arc-c absolute -right-24 -bottom-32 block w-[36rem] text-[var(--color-primary)] opacity-90 lg:w-[52rem]">
          <MotionArc className="block w-full" />
        </span>
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-[88rem] flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_28rem]">
        <div className="flex flex-col gap-10 px-6 pt-6 pb-8 lg:px-14 lg:py-12">
          <Link
            to={ROUTES.home}
            className="auth-home-mark"
            aria-label={`${pt.app.name}. ${pt.auth.backToHome}`}
          >
            <span className="auth-mark-pulse">
              <BrandMark size="lg" layout="horizontal" tone="onDark" alt="" />
            </span>
          </Link>
          <div className="max-w-xl lg:mt-[8vh]">
            <h1 className="font-display max-w-[11ch] text-[clamp(2.8rem,7.2vw,6.25rem)] font-semibold leading-[0.9] tracking-tight text-pretty">
              {pt.app.loginHeadline}
            </h1>
            <p className="mt-6 max-w-md text-lg text-[var(--color-ink-foreground)]/78 text-pretty">
              {pt.app.loginSubline}
            </p>
            <ol className="mt-8 flex flex-wrap gap-2">
              {[pt.app.loginBeatCheckIn, pt.app.loginBeatTrain, pt.app.loginBeatVisit].map((beat) => (
                <li
                  key={beat}
                  className="flex items-center gap-2 rounded-full bg-white/12 px-3.5 py-2 text-sm backdrop-blur-[2px]"
                >
                  <span className="size-1.5 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
                  {beat}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="flex flex-1 items-end px-4 pb-5 lg:items-center lg:px-10 lg:py-12">
          <div className="kinesio-ticket relative w-full overflow-hidden rounded-[1.75rem] rounded-tl-[2.75rem] bg-[var(--color-card)] text-[var(--color-foreground)]">
            <span className="absolute inset-y-0 left-0 w-2 bg-[var(--color-primary)]" aria-hidden="true" />
            <div className="p-6 pl-8 sm:p-9 sm:pl-11">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  )
}

export function SubscribePage() {
  return (
    <AuthLayout>
      <SubscribeForm />
    </AuthLayout>
  )
}

export function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  )
}

export function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  )
}

export function InviteAcceptPage() {
  return (
    <AuthLayout>
      <InviteAcceptForm />
    </AuthLayout>
  )
}

export function CaregiverSignupPage() {
  return (
    <AuthLayout>
      <CaregiverSignupForm />
    </AuthLayout>
  )
}
