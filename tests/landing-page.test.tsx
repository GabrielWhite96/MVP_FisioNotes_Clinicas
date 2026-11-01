import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LandingPage } from '@/pages/landing/landing-page'
import { SAAS_PLAN } from '@/shared/config/saas-plan'
import { pt } from '@/shared/config/i18n/pt'

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    profile: undefined,
    isLoading: false,
    user: null,
    session: null,
  }),
}))

describe('LandingPage', () => {
  beforeEach(() => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    )
  })

  it('renders brand, header auth actions and pricing', () => {
    expect(screen.getAllByAltText(pt.landing.heroBrand).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: pt.landing.login }).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('link', { name: pt.landing.signup }).length).toBeGreaterThan(0)
    expect(screen.getByText(SAAS_PLAN.amountLabel)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: pt.landing.pricingTitle })).toBeInTheDocument()
  })

  it('renders feature, tools, benefits and FAQ sections', () => {
    expect(screen.getByRole('heading', { name: pt.landing.featuresTitle })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: pt.landing.toolsTitle })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: pt.landing.benefitsTitle })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: pt.landing.faqTitle })).toBeInTheDocument()
    expect(screen.getByText(pt.landing.featureAgendaTitle)).toBeInTheDocument()
  })

  it('exposes skip link and section anchors', () => {
    expect(screen.getByRole('link', { name: pt.landing.skipToContent })).toHaveAttribute('href', '#conteudo')
    expect(document.querySelector('#funcionalidades')).toBeTruthy()
    expect(document.querySelector('#assinatura')).toBeTruthy()
    expect(document.querySelector('#faq')).toBeTruthy()
  })
})
