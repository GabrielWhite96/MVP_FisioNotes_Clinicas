import { Link } from 'react-router-dom'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { BrandMark } from '@/shared/ui/brand'

export function LandingFooter() {
  return (
    <footer className="landing-footer relative overflow-hidden border-t border-[color-mix(in_oklab,var(--landing-cyan)_28%,transparent)] text-[color-mix(in_oklab,white_86%,transparent)]">
      <div className="relative z-[1] mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="landing-glass-dark flex flex-col gap-6 rounded-2xl px-5 py-8 sm:px-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-md">
            <BrandMark layout="horizontal" size="md" tone="onDark" />
            <p className="mt-3 text-sm leading-relaxed">{pt.landing.footerTagline}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link to={ROUTES.login} className="transition-colors duration-150 ease-[var(--ease-out)] hover:text-white hover:underline">
              {pt.landing.footerLogin}
            </Link>
            <Link to={ROUTES.subscribe} className="transition-colors duration-150 ease-[var(--ease-out)] hover:text-white hover:underline">
              {pt.landing.footerSignup}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
