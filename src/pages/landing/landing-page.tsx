import { LandingHeader } from '@/widgets/landing/landing-header'
import { LandingHero } from '@/widgets/landing/landing-hero'
import { LandingFeatures } from '@/widgets/landing/landing-features'
import { LandingTools } from '@/widgets/landing/landing-tools'
import { LandingBenefits } from '@/widgets/landing/landing-benefits'
import { LandingPricing } from '@/widgets/landing/landing-pricing'
import { LandingFaq } from '@/widgets/landing/landing-faq'
import { LandingFooter } from '@/widgets/landing/landing-footer'
import { useLandingAtmosphere } from '@/widgets/landing/use-landing-atmosphere'
import { pt } from '@/shared/config/i18n/pt'

export function LandingPage() {
  const { rootRef, headerRef, progressRef, parallaxRef } = useLandingAtmosphere()

  return (
    <div
      ref={rootRef}
      className="landing-root min-h-screen bg-[var(--landing-paper)] font-[family-name:var(--font-landing-sans)] text-[var(--landing-ink)] antialiased"
    >
      <a
        href="#conteudo"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:m-0 focus:inline-flex focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded-md focus:bg-[var(--landing-teal)] focus:px-4 focus:py-2 focus:text-white"
      >
        {pt.landing.skipToContent}
      </a>
      <LandingHeader headerRef={headerRef} progressRef={progressRef} />
      <main id="conteudo">
        <LandingHero parallaxRef={parallaxRef} />
        <LandingFeatures />
        <LandingTools />
        <LandingBenefits />
        <LandingPricing />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  )
}
