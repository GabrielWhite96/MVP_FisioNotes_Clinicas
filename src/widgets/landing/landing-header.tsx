import { useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { Button, buttonVariants } from '@/shared/ui/button'
import { ROUTES } from '@/shared/config/routes'
import { pt } from '@/shared/config/i18n/pt'
import { BrandMark } from '@/shared/ui/brand'
import { cn } from '@/shared/lib/utils'

const anchors = [
  { href: '#funcionalidades', label: pt.landing.navFeatures },
  { href: '#ferramentas', label: pt.landing.navTools },
  { href: '#vantagens', label: pt.landing.navBenefits },
  { href: '#assinatura', label: pt.landing.navPricing },
  { href: '#faq', label: pt.landing.navFaq },
] as const

interface LandingHeaderProps {
  headerRef: RefObject<HTMLElement | null>
  progressRef: RefObject<HTMLSpanElement | null>
}

export function LandingHeader({ headerRef, progressRef }: LandingHeaderProps) {
  const [open, setOpen] = useState(false)

  return (
    <header ref={headerRef} className="landing-header pointer-events-none fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-4">
      <div className="landing-glass pointer-events-auto relative mx-auto max-w-6xl overflow-hidden rounded-2xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-5">
          <a href="#topo" className="flex min-w-0 items-center">
            <span className="landing-mark origin-left">
              <BrandMark layout="horizontal" size="md" className="max-h-9" />
            </span>
          </a>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Seções">
            {anchors.map((item) => (
              <a
                key={item.href}
                href={item.href}
                data-landing-nav=""
                className="landing-nav-link rounded-lg px-3 py-2 text-sm font-medium text-[var(--landing-ink-muted)]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              to={ROUTES.login}
              className={cn(buttonVariants({ variant: 'ghost' }), 'landing-cta text-[var(--landing-ink)] hover:bg-white/40')}
            >
              {pt.landing.login}
            </Link>
            <Link
              to={ROUTES.subscribe}
              className={cn(buttonVariants(), 'landing-cta landing-cta-primary bg-[var(--landing-teal)] text-white hover:opacity-90')}
            >
              {pt.landing.signup}
            </Link>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="landing-mobile-nav"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        <div
          id="landing-mobile-nav"
          className="landing-mobile-nav"
          data-open={open ? '' : undefined}
          inert={!open}
          aria-hidden={!open}
        >
          <div className="landing-mobile-nav-inner">
            <div className="border-t border-white/40 px-4 py-4">
              <nav className="flex flex-col gap-1" aria-label="Seções mobile">
                {anchors.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    data-landing-nav=""
                    className="landing-nav-link rounded-lg px-3 py-3 text-base font-medium text-[var(--landing-ink)]"
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
              <div className="mt-4 flex flex-col gap-2 sm:hidden">
                <Link to={ROUTES.login} className={cn(buttonVariants({ variant: 'outline' }), 'landing-cta w-full bg-white/40')}>
                  {pt.landing.login}
                </Link>
                <Link
                  to={ROUTES.subscribe}
                  className={cn(
                    buttonVariants(),
                    'landing-cta landing-cta-primary w-full bg-[var(--landing-teal)] text-white hover:opacity-90'
                  )}
                >
                  {pt.landing.signup}
                </Link>
              </div>
            </div>
          </div>
        </div>
        <span ref={progressRef} className="landing-progress" aria-hidden />
      </div>
    </header>
  )
}
