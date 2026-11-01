import {
  CalendarDays,
  ClipboardList,
  Target,
  Dumbbell,
  HeartPulse,
  FileText,
  Wallet,
  Users,
} from 'lucide-react'
import { LandingReveal } from '@/widgets/landing/landing-reveal'
import { pt } from '@/shared/config/i18n/pt'
import { cn } from '@/shared/lib/utils'

const features = [
  { icon: CalendarDays, title: pt.landing.featureAgendaTitle, body: pt.landing.featureAgendaBody, tone: 'landing-tone-teal' },
  { icon: ClipboardList, title: pt.landing.featureChartTitle, body: pt.landing.featureChartBody, tone: 'landing-tone-cyan' },
  { icon: Target, title: pt.landing.featurePlanTitle, body: pt.landing.featurePlanBody, tone: 'landing-tone-mint' },
  { icon: Dumbbell, title: pt.landing.featureExercisesTitle, body: pt.landing.featureExercisesBody, tone: 'landing-tone-teal' },
  { icon: HeartPulse, title: pt.landing.featureCheckInTitle, body: pt.landing.featureCheckInBody, tone: 'landing-tone-coral' },
  { icon: FileText, title: pt.landing.featureReportsTitle, body: pt.landing.featureReportsBody, tone: 'landing-tone-cyan' },
  { icon: Wallet, title: pt.landing.featureBillingTitle, body: pt.landing.featureBillingBody, tone: 'landing-tone-amber' },
  { icon: Users, title: pt.landing.featurePortalTitle, body: pt.landing.featurePortalBody, tone: 'landing-tone-mint' },
] as const

export function LandingFeatures() {
  return (
    <section id="funcionalidades" className="landing-band scroll-mt-28 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LandingReveal>
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] sm:text-4xl">
            {pt.landing.featuresTitle}
          </h2>
          <p className="mt-3 text-lg text-[var(--landing-ink-muted)]">{pt.landing.featuresSubtitle}</p>
        </div>

        <ul className="landing-stagger mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5">
          {features.map(({ icon: Icon, title, body, tone }) => (
            <li
              key={title}
              className={cn(
                'landing-glass-card landing-feature flex gap-4 rounded-2xl p-5',
                tone
              )}
            >
              <span className="landing-icon-well mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--landing-tone)]">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 className="text-lg font-semibold text-[var(--landing-ink)]">{title}</h3>
                <p className="mt-1.5 text-[var(--landing-ink-muted)]">{body}</p>
              </div>
            </li>
          ))}
        </ul>
        </LandingReveal>
      </div>
    </section>
  )
}
