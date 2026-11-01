import { useEffect, useRef } from 'react'

const SECTION_IDS = ['funcionalidades', 'ferramentas', 'vantagens', 'assinatura', 'faq'] as const

function prefersReducedMotion() {
  return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function useLandingAtmosphere() {
  const rootRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLSpanElement>(null)
  const parallaxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const header = headerRef.current
    const progress = progressRef.current
    const parallax = parallaxRef.current
    if (!root) return

    document.documentElement.classList.add('landing-smooth')

    const syncPause = () => {
      root.classList.toggle('is-paused', document.hidden)
    }
    syncPause()
    document.addEventListener('visibilitychange', syncPause)

    let ticking = false
    let scrolled = false
    const updateScroll = () => {
      ticking = false
      const y = window.scrollY
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      const nextProgress = Math.min(1, Math.max(0, y / max))
      if (progress) {
        progress.style.transform = `scaleX(${nextProgress})`
      }
      const nextScrolled = y > 16
      if (nextScrolled !== scrolled) {
        scrolled = nextScrolled
        header?.toggleAttribute('data-scrolled', nextScrolled)
      }
      if (parallax && !prefersReducedMotion()) {
        parallax.style.transform = `translate3d(0, ${y * 0.12}px, 0)`
      }
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(updateScroll)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    updateScroll()

    const navLinks = header?.querySelectorAll<HTMLAnchorElement>('a[data-landing-nav]')
    const setCurrent = (id: string) => {
      navLinks?.forEach((link) => {
        const current = link.getAttribute('href') === `#${id}`
        if (current) link.setAttribute('aria-current', 'page')
        else link.removeAttribute('aria-current')
      })
    }

    const observers: IntersectionObserver[] = []
    if (typeof IntersectionObserver !== 'undefined') {
      const sectionObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setCurrent(entry.target.id)
          }
        },
        { rootMargin: '-42% 0px -48% 0px', threshold: 0 }
      )
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id)
        if (el) sectionObserver.observe(el)
      }
      observers.push(sectionObserver)

      if (!prefersReducedMotion()) {
        const revealObserver = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue
              const el = entry.target as HTMLElement
              el.dataset.visible = ''
              delete el.dataset.pending
              revealObserver.unobserve(el)
            }
          },
          { threshold: 0.16, rootMargin: '0px 0px -10% 0px' }
        )
        root.querySelectorAll<HTMLElement>('.landing-reveal').forEach((el) => {
          const rect = el.getBoundingClientRect()
          if (rect.top < window.innerHeight * 0.88) {
            el.dataset.visible = ''
            return
          }
          el.dataset.pending = ''
          revealObserver.observe(el)
        })
        observers.push(revealObserver)
      }
    }

    return () => {
      document.documentElement.classList.remove('landing-smooth')
      document.removeEventListener('visibilitychange', syncPause)
      window.removeEventListener('scroll', onScroll)
      observers.forEach((observer) => observer.disconnect())
    }
  }, [])

  return { rootRef, headerRef, progressRef, parallaxRef }
}
