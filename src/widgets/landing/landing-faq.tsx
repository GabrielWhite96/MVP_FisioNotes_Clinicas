import { LandingReveal } from '@/widgets/landing/landing-reveal'
import { pt } from '@/shared/config/i18n/pt'

const faqs = [
  { q: pt.landing.faq1Q, a: pt.landing.faq1A },
  { q: pt.landing.faq2Q, a: pt.landing.faq2A },
  { q: pt.landing.faq3Q, a: pt.landing.faq3A },
  { q: pt.landing.faq4Q, a: pt.landing.faq4A },
  { q: pt.landing.faq5Q, a: pt.landing.faq5A },
] as const

export function LandingFaq() {
  return (
    <section id="faq" className="landing-band scroll-mt-28 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <LandingReveal>
        <h2 className="font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] sm:text-4xl">
          {pt.landing.faqTitle}
        </h2>
        <div className="landing-stagger mt-8 space-y-3">
          {faqs.map((item) => (
            <details key={item.q} className="landing-glass-card landing-faq-item group rounded-2xl px-5 py-4">
              <summary className="landing-cta cursor-pointer list-none text-lg font-semibold text-[var(--landing-ink)] marker:content-none select-none [&::-webkit-details-marker]:hidden">
                <span className="flex items-center justify-between gap-4">
                  {item.q}
                  <span
                    className="landing-faq-plus text-[var(--landing-teal)] group-open:rotate-45"
                    aria-hidden
                  >
                    +
                  </span>
                </span>
              </summary>
              <p className="landing-faq-answer mt-3 text-[var(--landing-ink-muted)]">{item.a}</p>
            </details>
          ))}
        </div>
        </LandingReveal>
      </div>
    </section>
  )
}
