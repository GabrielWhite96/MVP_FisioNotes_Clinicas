import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PhysioToolDetailPage } from '@/features/clinical-tools/ui/tool-detail-page'
import { PhysioToolsPage } from '@/features/clinical-tools/ui/tools-page'

vi.mock('@/features/auth/hooks/use-auth', () => ({
  useAuth: () => ({
    session: { user: { id: 'user-1' } },
    user: { id: 'user-1' },
    profile: { id: 'profile-1', role: 'physiotherapist', full_name: 'Dra. Teste' },
    isLoading: false,
    isAuthenticated: true,
  }),
}))

vi.mock('@/features/notifications/hooks/use-realtime-notifications', () => ({
  useRealtimeNotifications: () => undefined,
}))

vi.mock('@/entities/physiotherapist/api/physiotherapist-api', () => ({
  getPhysiotherapistByProfileId: vi.fn(async () => ({
    id: 'phy-1',
    subscription_status: 'active',
    trial_ends_at: null,
  })),
}))

function renderLibrary() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/physio/ferramentas']}>
        <Routes>
          <Route path="/physio/ferramentas" element={<PhysioToolsPage />} />
          <Route path="/physio/ferramentas/:slug" element={<PhysioToolDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('clinical tools screens', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('searches, filters, calculates and remembers a favorite', async () => {
    const user = userEvent.setup()
    renderLibrary()

    expect(screen.getByRole('heading', { name: 'Biblioteca de ferramentas' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Geriatria' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Testes e avaliações clínicas' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Geriatria' }))
    expect(screen.getByRole('heading', { name: 'Timed Up and Go' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'DASH' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    await user.type(screen.getByLabelText('Buscar'), 'queda')
    expect(screen.getByRole('heading', { name: 'Timed Up and Go' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Buscar'))
    await user.type(screen.getByLabelText('Buscar'), 'joelho')
    expect(screen.getByRole('heading', { name: 'WOMAC' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Agachamento parcial' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Timed Up and Go' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await user.click(screen.getByRole('button', { name: 'Testes e avaliações clínicas' }))
    await user.click(screen.getByRole('button', { name: 'Pediátricos' }))
    expect(screen.getByText('Ainda sem conteúdo revisado')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await user.click(screen.getByRole('button', { name: 'Protocolos de aplicação' }))
    expect(screen.getByRole('heading', { name: 'Timed Up and Go' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Índice de massa corporal' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))
    await user.type(screen.getByLabelText('Buscar'), 'oswestry')
    await user.click(screen.getByRole('link', { name: /Oswestry Disability Index/ }))
    expect(screen.getByText(/protegido por direitos autorais/i)).toBeInTheDocument()
    expect(screen.queryByText(/Section 1/)).not.toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'Voltar à biblioteca' }))
    await user.clear(screen.getByLabelText('Buscar'))
    await user.click(screen.getByRole('link', { name: /Índice de massa corporal/ }))

    await user.type(screen.getByLabelText('Peso (kg)'), '10')
    await user.type(screen.getByLabelText('Altura (cm)'), '170')
    await user.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(screen.getByRole('alert')).toHaveTextContent('mínimo aceito neste campo é 20')

    await user.click(screen.getByRole('button', { name: 'Limpar' }))
    await user.type(screen.getByLabelText('Peso (kg)'), '70')
    await user.type(screen.getByLabelText('Altura (cm)'), '170')
    await user.click(screen.getByRole('button', { name: 'Calcular' }))
    expect(screen.getByText('24,2 kg/m²')).toBeInTheDocument()
    expect(screen.getByText('Adequado')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Favoritar Índice de massa corporal' }))
    await user.click(screen.getByRole('link', { name: 'Voltar à biblioteca' }))

    const recents = screen.getByRole('heading', { name: 'Recentes' }).closest('section')
    expect(recents).not.toBeNull()
    expect(within(recents as HTMLElement).getByRole('link', { name: 'Índice de massa corporal' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Favoritos' })).toBeInTheDocument()
  })
})
