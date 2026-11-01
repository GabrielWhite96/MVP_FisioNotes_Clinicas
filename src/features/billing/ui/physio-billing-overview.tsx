import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPhysioBillingOverview } from '@/entities/billing/api/billing-api'
import { queryKeys } from '@/shared/api/query-keys'
import { formatMoney } from '@/shared/lib/money'
import { ROUTES, BILLING_MODE_LABELS, BANKNOTE_METHOD_LABELS } from '@/shared/config/routes'
import { Badge } from '@/shared/ui/badge'
import { EmptyState, LoadingSpinner } from '@/shared/ui/states'
import { ChevronRight } from 'lucide-react'

export function PhysioBillingOverview({ physiotherapistId }: { physiotherapistId: string }) {
  const query = useQuery({
    queryKey: queryKeys.physioBillingOverview(physiotherapistId),
    queryFn: () => getPhysioBillingOverview(physiotherapistId),
  })

  if (query.isLoading) return <LoadingSpinner />

  const rows = query.data ?? []
  const withBalance = rows.filter((r) => r.balanceCents > 0)
  const totalOpen = rows.reduce((sum, r) => sum + r.balanceCents, 0)
  const totalReceived = rows.reduce((sum, r) => sum + r.paidCents, 0)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">Em aberto (todos)</p>
          <p className="text-2xl font-semibold text-[var(--color-destructive)]">
            {formatMoney(totalOpen, 'BRL', 'pt-BR')}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">Já recebido</p>
          <p className="text-2xl font-semibold">{formatMoney(totalReceived, 'BRL', 'pt-BR')}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-sm text-[var(--color-muted-foreground)]">Pacientes com pendência</p>
          <p className="text-2xl font-semibold">{withBalance.length}</p>
        </div>
      </div>

      {!rows.length ? (
        <EmptyState title="Nenhum paciente" description="Cadastre pacientes para organizar recebimentos." />
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Link
              key={row.patientId}
              to={`${ROUTES.physio.patient(row.patientId)}?tab=billing`}
              className="flex items-center justify-between rounded-lg border p-4 hover:bg-[var(--color-accent)]"
            >
              <div className="space-y-1">
                <p className="font-medium">{row.patientName}</p>
                <div className="flex flex-wrap gap-2">
                  {row.agreement ? (
                    <>
                      <Badge variant="secondary">{BILLING_MODE_LABELS[row.agreement.billing_mode]}</Badge>
                      <Badge variant="outline">
                        {formatMoney(row.agreement.session_price_cents, row.currency, 'pt-BR')}/sessão
                      </Badge>
                      {row.agreement.preferred_method && (
                        <Badge variant="outline">
                          {BANKNOTE_METHOD_LABELS[row.agreement.preferred_method]}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <Badge variant="outline">Falta definir valor</Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`font-semibold ${row.balanceCents > 0 ? 'text-[var(--color-destructive)]' : ''}`}>
                    {formatMoney(row.balanceCents, row.currency, 'pt-BR')}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {row.openChargesCount > 0
                      ? `${row.openChargesCount} em aberto`
                      : 'Em dia'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--color-muted-foreground)]" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
