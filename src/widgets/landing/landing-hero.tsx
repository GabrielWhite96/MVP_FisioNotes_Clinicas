import type { RefObject } from 'react'
import { Link } from 'react-router-dom'
import { buttonVariants } from '@/shared/ui/button'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { BrandMark } from '@/shared/ui/brand'
import { cn } from '@/shared/lib/utils'

const careSteps = [
  { label: pt.landing.careStepComplaint, tone: 'landing-tone-teal' },
  { label: pt.landing.careStepPlan, tone: 'landing-tone-cyan' },
  { label: pt.landing.careStepSession, tone: 'landing-tone-mint' },
  { label: pt.landing.careStepCheckIn, tone: 'landing-tone-coral' },
] as const

export function LandingHero({ parallaxRef }: { parallaxRef: RefObject<HTMLDivElement | null> }) {
  return (
    <section id="topo" className="relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,var(--landing-paper),color-mix(in_oklab,var(--landing-mist)_70%,white),color-mix(in_oklab,var(--landing-mint-soft)_55%,var(--landing-paper)))]"
        aria-hidden
      />
      <div ref={parallaxRef} className="landing-parallax pointer-events-none absolute inset-0 z-0" aria-hidden>
        <div className="landing-orb landing-orb-a" />
        <div className="landing-orb landing-orb-b" />
        <div className="landing-orb landing-orb-c" />
      </div>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-28 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end lg:pb-24 lg:pt-32">
        <div className="landing-hero-copy max-w-xl">
          <BrandMark layout="stacked" size="lg" className="max-w-[16rem] sm:max-w-[18rem]" />
          <h1 className="mt-4 font-[family-name:var(--font-landing-display)] text-3xl font-semibold leading-[1.15] tracking-tight text-[var(--landing-ink)] sm:text-4xl">
            {pt.landing.heroTitle}
          </h1>
          <p className="mt-5 max-w-prose text-lg text-[var(--landing-ink-muted)]">
            {pt.landing.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              to={ROUTES.subscribe}
              className={cn(
                buttonVariants({ size: 'lg' }),
                'landing-cta landing-cta-primary bg-[var(--landing-teal)] text-white hover:opacity-90'
              )}
            >
              {pt.landing.heroPrimary}
            </Link>
            <Link
              to={ROUTES.login}
              className={cn(
                buttonVariants({ size: 'lg', variant: 'outline' }),
                'landing-cta landing-glass-chip border-white/50'
              )}
            >
              {pt.landing.heroSecondary}
            </Link>
          </div>
        </div>

        <aside
          className="landing-care-sheet landing-glass relative overflow-hidden rounded-2xl p-5 sm:p-6"
          aria-label={pt.landing.careLineTitle}
        >
          <p className="text-sm font-medium text-[var(--landing-teal)]">{pt.landing.careLineTitle}</p>
          <ol className="relative mt-5 space-y-0">
            <span className="landing-care-rail" aria-hidden>
              <span className="landing-care-pulse-track">
                <span className="landing-care-pulse" />
              </span>
            </span>
            {careSteps.map((step, index, list) => (
              <li key={step.label} className={cn('landing-care-item relative z-[1] flex gap-4 pb-6 last:pb-0', step.tone)}>
                {index < list.length - 1 && (
                  <span
                    className="absolute left-[15px] top-8 h-[calc(100%-1.25rem)] w-px bg-[color-mix(in_oklab,var(--landing-tone)_45%,transparent)]"
                    aria-hidden
                  />
                )}
                <span className="landing-care-dot relative z-[1] mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--landing-tone)] text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <div className="landing-glass-chip min-w-0 flex-1 rounded-lg px-3 py-2.5">
                  <p className="font-medium text-[var(--landing-ink)]">{step.label}</p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--landing-tone-soft)]">
                    <div
                      className="landing-care-bar h-full rounded-full bg-[var(--landing-tone)]"
                      style={{ width: `${35 + index * 18}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  )
}
