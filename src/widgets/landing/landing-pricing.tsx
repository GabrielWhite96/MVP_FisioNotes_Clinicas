import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/shared/ui/button'
import { ROUTES } from '@/shared/config/routes'
import { SAAS_PLAN } from '@/shared/config/saas-plan'
import { LandingReveal } from '@/widgets/landing/landing-reveal'
import { pt } from '@/shared/config/i18n/pt'
import { cn } from '@/shared/lib/utils'

const bullets = [
  pt.landing.pricingBullet1,
  pt.landing.pricingBullet2,
  pt.landing.pricingBullet3,
] as const

export function LandingPricing() {
  return (
    <section
      id="assinatura"
      className="scroll-mt-28 border-y border-[color-mix(in_oklab,var(--landing-teal)_14%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--landing-mint-soft)_40%,var(--landing-paper)),color-mix(in_oklab,var(--landing-mist)_55%,white))] py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <LandingReveal>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] sm:text-4xl">
            {pt.landing.pricingTitle}
          </h2>
          <p className="mt-3 text-lg text-[var(--landing-ink-muted)]">{pt.landing.pricingSubtitle}</p>
        </div>

        <div className="landing-glass relative mx-auto mt-10 max-w-md overflow-hidden rounded-2xl">
          <span className="landing-pricing-sheen" aria-hidden />
          <div className="bg-[var(--landing-teal)] px-8 py-5 text-white">
            <p className="text-sm font-medium">{SAAS_PLAN.name}</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="font-[family-name:var(--font-landing-display)] text-5xl font-semibold">
                {SAAS_PLAN.amountLabel}
              </span>
              <span className="text-white/80">{pt.landing.pricingAmountSuffix}</span>
            </p>
          </div>
          <div className="p-8">
            <ul className="space-y-3">
              {bullets.map((item) => (
                <li key={item} className="flex gap-3 text-[var(--landing-ink)]">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-[#047857]" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <Link
              to={ROUTES.subscribe}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'landing-cta landing-cta-primary mt-8 w-full bg-[var(--landing-teal)] text-white hover:opacity-90'
              )}
            >
              {pt.landing.pricingCta}
            </Link>
            <p className="mt-4 text-center text-sm text-[var(--landing-ink-muted)]">{pt.landing.pricingNote}</p>
          </div>
        </div>
        </LandingReveal>
      </div>
    </section>
  )
}
