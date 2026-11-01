import { Library } from 'lucide-react'
import { LandingReveal } from '@/widgets/landing/landing-reveal'
import { pt } from '@/shared/config/i18n/pt'

const chipTones = [
  'landing-tone-teal',
  'landing-tone-cyan',
  'landing-tone-mint',
  'landing-tone-amber',
  'landing-tone-coral',
  'landing-tone-teal',
  'landing-tone-cyan',
] as const

export function LandingTools() {
  const chips = [...pt.landing.toolsChips, ...pt.landing.toolsChips]

  return (
    <section
      id="ferramentas"
      className="scroll-mt-28 overflow-hidden border-y border-[color-mix(in_oklab,var(--landing-teal)_14%,transparent)] bg-[linear-gradient(180deg,color-mix(in_oklab,var(--landing-mist)_70%,white),color-mix(in_oklab,var(--landing-mint-soft)_45%,var(--landing-paper)))] py-16 sm:py-20"
    >
      <LandingReveal>
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--landing-teal)] px-3 py-1 text-sm font-medium text-white">
            <Library className="h-4 w-4" aria-hidden />
            {pt.landing.toolsCount}
          </div>
          <h2 className="mt-4 font-[family-name:var(--font-landing-display)] text-3xl font-semibold tracking-tight text-[var(--landing-ink)] sm:text-4xl">
            {pt.landing.toolsTitle}
          </h2>
          <p className="mt-3 text-lg text-[var(--landing-ink-muted)]">{pt.landing.toolsSubtitle}</p>
        </div>
        <p className="landing-glass landing-glass-float rounded-2xl p-6 text-base leading-relaxed text-[var(--landing-ink)] sm:p-8 sm:text-lg">
          {pt.landing.toolsCategories}
        </p>
      </div>

      <div className="landing-marquee mt-10" role="presentation">
        <div className="landing-marquee-track gap-3 px-4">
          {chips.map((chip, index) => (
            <span
              key={`${chip}-${index}`}
              className={`${chipTones[index % chipTones.length]} landing-glass-chip shrink-0 rounded-full px-4 py-2 text-sm font-medium text-[var(--landing-tone)]`}
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
      </LandingReveal>
    </section>
  )
}
