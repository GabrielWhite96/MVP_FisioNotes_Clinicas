import { AlertTriangle, GitCompareArrows, ChartNoAxesColumn, Smartphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/shared/ui/button'
import { ROUTES } from '@/shared/config/routes'
import { LandingReveal } from '@/widgets/landing/landing-reveal'
import { pt } from '@/shared/config/i18n/pt'
import { cn } from '@/shared/lib/utils'

const benefits = [
  { icon: AlertTriangle, title: pt.landing.benefitRiskTitle, body: pt.landing.benefitRiskBody, tone: 'landing-tone-coral' },
  { icon: GitCompareArrows, title: pt.landing.benefitCompareTitle, body: pt.landing.benefitCompareBody, tone: 'landing-tone-cyan' },
  { icon: ChartNoAxesColumn, title: pt.landing.benefitAdhereTitle, body: pt.landing.benefitAdhereBody, tone: 'landing-tone-mint' },
  { icon: Smartphone, title: pt.landing.benefitPwaTitle, body: pt.landing.benefitPwaBody, tone: 'landing-tone-teal' },
] as const

export function LandingBenefits() {
  return (
    <section id="vantagens" className="landing-band-warm scroll-mt-28 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LandingReveal>
        <div className="max-w-2xl">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] sm:text-4xl">
            {pt.landing.benefitsTitle}
          </h2>
          <p className="mt-3 text-lg text-[var(--landing-ink-muted)]">{pt.landing.benefitsSubtitle}</p>
        </div>

        <ul className="landing-stagger mt-10 grid gap-5 sm:grid-cols-2">
          {benefits.map(({ icon: Icon, title, body, tone }) => (
            <li
              key={title}
              className={cn('landing-glass-card landing-benefit rounded-2xl p-6', tone)}
            >
              <span className="landing-icon-well inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--landing-tone)]">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-[var(--landing-ink)]">{title}</h3>
              <p className="mt-2 text-[var(--landing-ink-muted)]">{body}</p>
            </li>
          ))}
        </ul>

        <div className="landing-mid-cta relative mt-14 overflow-hidden rounded-2xl">
          <span className="landing-pricing-sheen" aria-hidden />
          <div className="landing-glass-dark relative px-6 py-10 text-center sm:px-10">
            <h3 className="font-[family-name:var(--font-landing-display)] text-2xl font-semibold text-white sm:text-3xl">
              {pt.landing.midCtaTitle}
            </h3>
            <p className="mx-auto mt-3 max-w-xl text-[color-mix(in_oklab,white_82%,transparent)]">
              {pt.landing.midCtaBody}
            </p>
            <Link
              to={ROUTES.subscribe}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'landing-cta landing-cta-primary mt-6 bg-[var(--landing-cyan)] text-[var(--landing-deep)] hover:opacity-90'
              )}
            >
              {pt.landing.midCtaButton}
            </Link>
          </div>
        </div>
        </LandingReveal>
      </div>
    </section>
  )
}
