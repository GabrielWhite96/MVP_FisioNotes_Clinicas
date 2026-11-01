import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Calendar,
  User,
  Dumbbell,
  Users,
  ClipboardList,
  Menu,
  X,
  LogOut,
  HeartPulse,
  Bell,
  ScrollText,
  HeartHandshake,
  Wallet,
  BarChart3,
  Library,
  CreditCard,
  Stethoscope,
  FileText,
} from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/use-auth'
import { signOut } from '@/features/auth/api/auth-api'
import { ConsentModal } from '@/features/consent/ui/consent-modal'
import { SubscriptionBanner } from '@/features/billing/ui/subscription-banner'
import { getPhysiotherapistByProfileId } from '@/entities/physiotherapist/api/physiotherapist-api'
import { canManagePractice } from '@/entities/physiotherapist/model/subscription-access'
import { queryKeys } from '@/shared/api/query-keys'
import { useRealtimeNotifications } from '@/features/notifications/hooks/use-realtime-notifications'
import { useTranslation } from '@/shared/config/i18n/use-translation'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'
import { BrandMark } from '@/shared/ui/brand'
import { MotionArc } from '@/shared/ui/motion-arc'
import { pt } from '@/shared/config/i18n/pt'
import { ROUTES } from '@/shared/config/routes'
import type { UserRole } from '@/shared/types/database'

interface NavItem {
  label: string
  shortLabel?: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navByRole: Record<UserRole, NavItem[]> = {
  patient: [
    { label: pt.patient.home, shortLabel: pt.patient.home, href: ROUTES.patient.dashboard, icon: LayoutDashboard },
    { label: pt.patient.appointments, shortLabel: pt.patient.appointments, href: ROUTES.patient.appointments, icon: Calendar },
    { label: pt.patient.exercises, shortLabel: 'Exercícios', href: ROUTES.patient.exercises, icon: Dumbbell },
    { label: pt.patient.howAmI, shortLabel: pt.patient.howAmI, href: ROUTES.patient.checkIn, icon: HeartPulse },
    { label: pt.patient.notifications, href: ROUTES.patient.notifications, icon: Bell },
    { label: pt.patient.caregivers, href: ROUTES.patient.caregivers, icon: Users },
    { label: pt.patient.profile, href: ROUTES.patient.profile, icon: User },
  ],
  physiotherapist: [
    { label: pt.physio.dashboard, href: ROUTES.physio.dashboard, icon: LayoutDashboard },
    { label: pt.physio.agenda, href: ROUTES.physio.agenda, icon: Calendar },
    { label: pt.physio.patients, href: ROUTES.physio.patients, icon: Users },
    { label: pt.physio.staff, href: ROUTES.physio.staff, icon: Stethoscope },
    { label: pt.tools.nav, shortLabel: pt.tools.nav, href: ROUTES.physio.tools, icon: Library },
    { label: pt.physio.forms, shortLabel: pt.physio.forms, href: ROUTES.physio.forms, icon: FileText },
    { label: pt.physio.billing, href: ROUTES.physio.billing, icon: Wallet },
    { label: pt.physio.reports, href: ROUTES.physio.reports, icon: BarChart3 },
    { label: pt.patient.notifications, href: ROUTES.physio.notifications, icon: Bell },
    { label: pt.patient.profile, href: ROUTES.physio.profile, icon: User },
  ],
  caregiver: [
    { label: pt.caregiver.dashboard, href: ROUTES.caregiver.dashboard, icon: HeartHandshake },
  ],
  admin: [
    { label: pt.admin.dashboard, href: ROUTES.admin.dashboard, icon: LayoutDashboard },
    { label: pt.admin.users, href: ROUTES.admin.users, icon: Users },
    { label: pt.admin.appointments, href: ROUTES.admin.appointments, icon: ClipboardList },
    { label: pt.admin.auditLogs, href: ROUTES.admin.auditLogs, icon: ScrollText },
  ],
}

const physioHubNav: NavItem[] = [
  { label: pt.physio.dashboard, href: ROUTES.physio.dashboard, icon: LayoutDashboard },
  { label: pt.saas.status, href: ROUTES.physio.subscription, icon: CreditCard },
  { label: pt.patient.notifications, href: ROUTES.physio.notifications, icon: Bell },
  { label: pt.patient.profile, href: ROUTES.physio.profile, icon: User },
]

export function AppLayout({ children }: { children?: ReactNode }) {
  const { profile, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const physioQuery = useQuery({
    queryKey: queryKeys.physiotherapist(user?.id ?? ''),
    queryFn: () => getPhysiotherapistByProfileId(user!.id),
    enabled: profile?.role === 'physiotherapist' && !!user?.id,
  })
  const clinicOpen = profile?.role !== 'physiotherapist'
    || physioQuery.isLoading
    || !physioQuery.data
    || canManagePractice(physioQuery.data)
  const mainRef = useRef<HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { locale, setLocale } = useTranslation()
  useRealtimeNotifications()
  const content = children ?? <Outlet />

  useEffect(() => {
    setMobileOpen(false)
    mainRef.current?.scrollTo({ top: 0 })
  }, [location.pathname])

  if (!profile) return <>{content}</>

  const navItems = profile.role === 'physiotherapist' && !clinicOpen
    ? physioHubNav
    : navByRole[profile.role]
  const isPatient = profile.role === 'patient'
  const patientMobileHrefs: string[] = [
    ROUTES.patient.dashboard,
    ROUTES.patient.appointments,
    ROUTES.patient.exercises,
    ROUTES.patient.checkIn,
  ]
  const physioMobileHrefs: string[] = clinicOpen
    ? [
      ROUTES.physio.dashboard,
      ROUTES.physio.agenda,
      ROUTES.physio.patients,
      ROUTES.physio.tools,
    ]
    : [
      ROUTES.physio.dashboard,
      ROUTES.physio.subscription,
      ROUTES.physio.notifications,
      ROUTES.physio.profile,
    ]
  const mobileNavItems = isPatient
    ? navItems.filter((item) => patientMobileHrefs.includes(item.href))
    : profile.role === 'physiotherapist'
      ? navItems.filter((item) => physioMobileHrefs.includes(item.href))
      : navItems.slice(0, 4)

  const handleLogout = async () => {
    await signOut()
    navigate('/auth/login')
  }

  const isActive = (href: string) => {
    const onPatientReport = location.pathname.endsWith('/relatorio')
    if (href === ROUTES.physio.reports) return location.pathname.startsWith(href) || onPatientReport
    if (href === ROUTES.physio.patients) return location.pathname.startsWith(href) && !onPatientReport
    if (href === ROUTES.physio.staff) return location.pathname.startsWith(href)
    if (href === ROUTES.physio.forms) return location.pathname.startsWith(href)
    return location.pathname.startsWith(href)
  }

  const NavLinks = ({ surface }: { surface: 'dock' | 'sheet' }) => (
    <>
      {navItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        const dock = surface === 'dock'
        return (
          <Link
            key={item.href}
            to={item.href}
            onClick={() => surface === 'sheet' && setMobileOpen(false)}
            className={cn(
              'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition-colors',
              isPatient && 'min-h-12 py-3 text-base md:min-h-0 md:py-2.5 md:text-sm',
              dock && active && 'relative bg-white/10 text-[var(--color-ink-foreground)] before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-full before:bg-[var(--color-primary)]',
              dock && !active && 'text-[var(--color-ink-foreground)]/65 hover:bg-white/8 hover:text-[var(--color-ink-foreground)]',
              !dock && active && 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
              !dock && !active && 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)] hover:text-[var(--color-foreground)]'
            )}
          >
            <Icon className={cn('h-4 w-4', isPatient && 'h-5 w-5')} />
            {item.label}
          </Link>
        )
      })}
    </>
  )

  return (
    <div className="flex h-dvh overflow-hidden print:h-auto print:overflow-visible">
      <ConsentModal />
      <aside className="studio-field relative hidden h-full w-64 shrink-0 flex-col overflow-hidden text-[var(--color-ink-foreground)] md:flex">
        <MotionArc
          key={location.pathname}
          className="pointer-events-none absolute -right-16 -bottom-16 w-56 text-[var(--color-primary)] opacity-50"
        />
        <div className="relative flex h-16 shrink-0 items-center px-5">
          <BrandMark size="sm" layout="horizontal" tone="onDark" className="max-w-[12.5rem]" />
        </div>
        <nav className="relative flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3">
          <NavLinks surface="dock" />
        </nav>
        <div className="relative shrink-0 p-4">
          <p className="mb-3 truncate text-sm font-bold">{profile.full_name}</p>
          <div className="mb-2 flex gap-2">
            <button
              type="button"
              className={cn(
                'flex-1 rounded-xl px-3 py-2 text-xs font-bold',
                locale === 'pt' ? 'bg-white/14' : 'text-[var(--color-ink-foreground)]/60 hover:bg-white/8'
              )}
              onClick={() => setLocale('pt')}
            >
              PT
            </button>
            <button
              type="button"
              className={cn(
                'flex-1 rounded-xl px-3 py-2 text-xs font-bold',
                locale === 'en' ? 'bg-white/14' : 'text-[var(--color-ink-foreground)]/60 hover:bg-white/8'
              )}
              onClick={() => setLocale('en')}
            >
              EN
            </button>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-start gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[var(--color-ink-foreground)]/70 hover:bg-white/8 hover:text-[var(--color-ink-foreground)]"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            {pt.auth.logout}
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden print:overflow-visible">
        <header className="studio-field flex h-14 shrink-0 items-center justify-between px-4 text-[var(--color-ink-foreground)] md:hidden">
          <BrandMark size="sm" layout="horizontal" tone="onDark" className="max-w-[11rem]" />
          <Button
            variant="ghost"
            size="icon"
            className="text-[var(--color-ink-foreground)] hover:bg-white/10 hover:text-[var(--color-ink-foreground)]"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>

        {mobileOpen && (
          <div className="shrink-0 border-b bg-[var(--color-card)] p-4 md:hidden">
            <nav className="flex flex-col gap-1">
              <NavLinks surface="sheet" />
            </nav>
            <Button variant="ghost" size="sm" className="mt-4 w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              {pt.auth.logout}
            </Button>
          </div>
        )}

        <main
          ref={mainRef}
          className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))] md:p-8 lg:p-10 print:overflow-visible"
        >
          <SubscriptionBanner />
          {content}
        </main>

        <nav className="flex shrink-0 bg-[var(--color-ink)] pb-[env(safe-area-inset-bottom)] text-[var(--color-ink-foreground)] md:hidden">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-bold',
                  isPatient && 'min-h-16 py-3 text-sm',
                  active ? 'text-[var(--color-primary)]' : 'text-[var(--color-ink-foreground)]/55'
                )}
              >
                <Icon className={cn('h-5 w-5', isPatient && 'h-6 w-6')} />
                <span className="truncate px-1">{item.shortLabel ?? item.label.split(' ')[0]}</span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
