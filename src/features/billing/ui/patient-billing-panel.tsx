import { useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  chargeRemainingCents,
  createManualCharge,
  deleteReceipt,
  getPatientBillingSummary,
  groupOpenChargesByWeek,
  markChargesPaid,
  markWeekPaid,
  registerPayment,
  upsertBillingAgreement,
  weekEndOf,
  type BillingAgreement,
  type BillingCharge,
  type BillingMode,
  type PaymentMethodKind,
  type PaymentReceipt,
} from '@/entities/billing/api/billing-api'
import { queryKeys } from '@/shared/api/query-keys'
import { formatDate, formatDateTime } from '@/shared/lib/dates'
import { formatMoney } from '@/shared/lib/money'
import { cn } from '@/shared/lib/utils'
import { BANKNOTE_METHOD_LABELS } from '@/shared/config/routes'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { Input, Label, Textarea } from '@/shared/ui/input'
import { Badge } from '@/shared/ui/badge'
import { EmptyState, ErrorState, LoadingSpinner } from '@/shared/ui/states'

const agreementSchema = z.object({
  billingMode: z.enum(['per_session', 'weekly']),
  sessionPrice: z.coerce.number().min(0, 'Informe o valor da sessão'),
  preferredMethod: z.enum(['pix', 'cash', 'other']),
  notes: z.string().optional(),
})

const paymentSchema = z.object({
  amount: z.coerce.number().positive('Informe um valor maior que zero'),
  method: z.enum(['pix', 'cash', 'other']),
  paidAt: z.string().min(1, 'Informe quando recebeu'),
  note: z.string().optional(),
})

const extraChargeSchema = z.object({
  amount: z.coerce.number().positive('Informe um valor maior que zero'),
  description: z.string().optional(),
})

type AgreementForm = z.infer<typeof agreementSchema>
type PaymentForm = z.infer<typeof paymentSchema>
type ExtraChargeForm = z.infer<typeof extraChargeSchema>

const METHOD_OPTIONS: Array<{ value: PaymentMethodKind; label: string }> = [
  { value: 'pix', label: 'Pix' },
  { value: 'cash', label: 'Dinheiro' },
  { value: 'other', label: 'Outro' },
]

const BILLING_MODE_OPTIONS: Array<{ value: BillingMode; label: string; hint: string }> = [
  { value: 'per_session', label: 'Cada sessão', hint: 'Marca o pagamento depois de cada consulta' },
  { value: 'weekly', label: 'A semana', hint: 'Recebe as sessões da semana de uma vez' },
]

function money(cents: number, currency = 'BRL') {
  return formatMoney(cents, currency, 'pt-BR')
}

function localDateTimeValue(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatWeekLabel(weekOf: string) {
  return `${formatDate(`${weekOf}T12:00:00`, 'd MMM')} – ${formatDate(`${weekEndOf(weekOf)}T12:00:00`, 'd MMM')}`
}

function chargeLabel(charge: BillingCharge) {
  if (charge.kind === 'manual') {
    const description = charge.description?.trim()
    if (description && !['Cobrança avulsa', 'Cobrança manual'].includes(description)) {
      return description
    }
    return 'Cobrança extra'
  }
  if (charge.appointment?.scheduled_at) {
    return `Sessão · ${formatDateTime(charge.appointment.scheduled_at)}`
  }
  return charge.description?.trim() || 'Sessão'
}

function agreementSummary(agreement: BillingAgreement, currency: string) {
  const method = agreement.preferred_method
    ? BANKNOTE_METHOD_LABELS[agreement.preferred_method]
    : null
  const parts = [
    `${money(agreement.session_price_cents, currency)} por sessão`,
    agreement.billing_mode === 'weekly' ? 'Paga a semana' : 'Paga cada sessão',
  ]
  if (method) parts.splice(1, 0, method)
  return parts.join(' · ')
}

function OptionButtons<T extends string>({
  legend,
  value,
  onChange,
  options,
  columns,
}: {
  legend: string
  value: T
  onChange: (value: T) => void
  options: Array<{ value: T; label: string; hint?: string }>
  columns: 2 | 3
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className={cn('grid gap-2', columns === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map((option) => {
          const selected = value === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                'min-w-0 rounded-lg border px-3 py-2 text-left transition-colors hover:bg-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                selected && 'border-[var(--color-primary)] bg-[var(--color-accent)]'
              )}
            >
              <span className="block truncate text-sm font-medium">{option.label}</span>
              {option.hint && (
                <span className="mt-0.5 block text-pretty text-xs text-[var(--color-muted-foreground)]">
                  {option.hint}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}

function AgreementFields({
  form,
}: {
  form: ReturnType<typeof useForm<AgreementForm>>
}) {
  const priceId = useId()
  const notesId = useId()
  const billingMode = form.watch('billingMode')
  const preferredMethod = form.watch('preferredMethod')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={priceId}>Quanto cobra por sessão?</Label>
        <Input
          id={priceId}
          type="number"
          inputMode="decimal"
          step="0.01"
          min="0"
          autoComplete="off"
          spellCheck={false}
          {...form.register('sessionPrice')}
        />
        {form.formState.errors.sessionPrice && (
          <p className="text-sm text-[var(--color-destructive)]">
            {form.formState.errors.sessionPrice.message}
          </p>
        )}
      </div>
      <OptionButtons
        legend="Como o paciente paga"
        value={billingMode}
        onChange={(value) => form.setValue('billingMode', value)}
        options={BILLING_MODE_OPTIONS}
        columns={2}
      />
      <OptionButtons
        legend="Forma mais comum"
        value={preferredMethod}
        onChange={(value) => form.setValue('preferredMethod', value)}
        options={METHOD_OPTIONS}
        columns={3}
      />
      <div className="flex flex-col gap-2">
        <Label htmlFor={notesId}>Observação (opcional)</Label>
        <Textarea
          id={notesId}
          rows={2}
          autoComplete="off"
          placeholder="Ex.: paga toda sexta no Pix…"
          {...form.register('notes')}
        />
      </div>
    </div>
  )
}

interface PatientBillingPanelProps {
  patientId: string
  physiotherapistId: string
}

export function PatientBillingPanel({ patientId, physiotherapistId }: PatientBillingPanelProps) {
  const queryClient = useQueryClient()
  const [agreementOpen, setAgreementOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [extraChargeOpen, setExtraChargeOpen] = useState(false)
  const [receiptToUndo, setReceiptToUndo] = useState<PaymentReceipt | null>(null)

  const summaryQuery = useQuery({
    queryKey: queryKeys.patientBilling(patientId),
    queryFn: () => getPatientBillingSummary(patientId),
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.patientBilling(patientId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.physioBillingOverview(physiotherapistId) })
  }

  const agreementForm = useForm<AgreementForm>({
    resolver: zodResolver(agreementSchema),
    defaultValues: {
      billingMode: 'weekly',
      sessionPrice: 150,
      preferredMethod: 'pix',
      notes: '',
    },
  })

  const paymentForm = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: undefined as unknown as number,
      method: 'pix',
      paidAt: localDateTimeValue(),
      note: '',
    },
  })

  const extraChargeForm = useForm<ExtraChargeForm>({
    resolver: zodResolver(extraChargeSchema),
    defaultValues: {
      amount: undefined as unknown as number,
      description: '',
    },
  })

  const saveAgreement = useMutation({
    mutationFn: (data: AgreementForm) =>
      upsertBillingAgreement({
        patientId,
        physiotherapistId,
        billingMode: data.billingMode,
        sessionPriceCents: Math.round(data.sessionPrice * 100),
        preferredMethod: data.preferredMethod,
        notes: data.notes || null,
      }),
    onSuccess: () => {
      setAgreementOpen(false)
      invalidate()
    },
  })

  const weekPayMutation = useMutation({
    mutationFn: (weekOf: string) =>
      markWeekPaid({
        patientId,
        physiotherapistId,
        weekOf,
        method: summaryQuery.data?.agreement?.preferred_method ?? 'pix',
      }),
    onSuccess: invalidate,
  })

  const payChargeMutation = useMutation({
    mutationFn: (chargeId: string) =>
      markChargesPaid({
        patientId,
        physiotherapistId,
        chargeIds: [chargeId],
        method: summaryQuery.data?.agreement?.preferred_method ?? 'pix',
      }),
    onSuccess: invalidate,
  })

  const partialPayMutation = useMutation({
    mutationFn: (data: PaymentForm) =>
      registerPayment({
        patientId,
        physiotherapistId,
        amountCents: Math.round(data.amount * 100),
        method: data.method,
        paidAt: new Date(data.paidAt).toISOString(),
        note: data.note || undefined,
      }),
    onSuccess: () => {
      setPaymentOpen(false)
      invalidate()
    },
  })

  const manualChargeMutation = useMutation({
    mutationFn: (data: ExtraChargeForm) =>
      createManualCharge({
        patientId,
        physiotherapistId,
        amountCents: Math.round(data.amount * 100),
        description: data.description?.trim() || 'Cobrança extra',
      }),
    onSuccess: () => {
      setExtraChargeOpen(false)
      extraChargeForm.reset({ amount: undefined as unknown as number, description: '' })
      invalidate()
    },
  })

  const deleteReceiptMutation = useMutation({
    mutationFn: deleteReceipt,
    onSuccess: () => {
      setReceiptToUndo(null)
      invalidate()
    },
  })

  const currency = summaryQuery.data?.agreement?.currency ?? 'BRL'
  const weekGroups = useMemo(
    () => groupOpenChargesByWeek(summaryQuery.data?.charges ?? []),
    [summaryQuery.data?.charges]
  )

  if (summaryQuery.isLoading) {
    return (
      <div role="status" aria-label="Carregando financeiro" className="flex justify-center py-10">
        <LoadingSpinner />
      </div>
    )
  }

  if (summaryQuery.error) {
    return (
      <ErrorState
        message="Não foi possível carregar o financeiro."
        onRetry={() => summaryQuery.refetch()}
      />
    )
  }

  const summary = summaryQuery.data!
  const agreement = summary.agreement
  const paying = payChargeMutation.isPending || weekPayMutation.isPending

  function fillAgreementForm(current?: BillingAgreement | null) {
    agreementForm.reset(
      current
        ? {
            billingMode: current.billing_mode,
            sessionPrice: current.session_price_cents / 100,
            preferredMethod: current.preferred_method ?? 'pix',
            notes: current.notes ?? '',
          }
        : {
            billingMode: 'weekly',
            sessionPrice: 150,
            preferredMethod: 'pix',
            notes: '',
          }
    )
  }

  function openPaymentDialog() {
    paymentForm.reset({
      amount: summary.balanceCents / 100,
      method: agreement?.preferred_method ?? 'pix',
      paidAt: localDateTimeValue(),
      note: '',
    })
    setPaymentOpen(true)
  }

  if (!agreement) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-pretty">Valor da sessão</CardTitle>
          <CardDescription>
            Defina quanto este paciente paga. Depois, é só marcar quando receber.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={agreementForm.handleSubmit((data) => saveAgreement.mutate(data))}
          >
            <AgreementFields form={agreementForm} />
            {saveAgreement.isError && (
              <p className="text-sm text-[var(--color-destructive)]">
                {(saveAgreement.error as Error).message}
              </p>
            )}
            <Button type="submit" disabled={saveAgreement.isPending}>
              {saveAgreement.isPending ? 'Salvando…' : 'Salvar valor da sessão'}
            </Button>
          </form>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {summary.balanceCents > 0 ? 'Falta receber' : 'Tudo em dia'}
            </p>
            <p
              className={cn(
                'text-3xl font-semibold tabular-nums tracking-tight',
                summary.balanceCents > 0 && 'text-[var(--color-destructive)]'
              )}
              aria-live="polite"
            >
              {money(summary.balanceCents, currency)}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {summary.balanceCents > 0
                ? `${summary.openChargesCount} ${summary.openChargesCount === 1 ? 'item em aberto' : 'itens em aberto'}`
                : 'Nenhuma sessão em aberto'}
              {summary.paidCents > 0 && ` · já recebeu ${money(summary.paidCents, currency)}`}
            </p>
          </div>
          {summary.balanceCents > 0 && (
            <Button type="button" onClick={openPaymentDialog}>
              Registrar pagamento
            </Button>
          )}
        </CardHeader>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3">
          <p className="min-w-0 text-sm text-[var(--color-muted-foreground)]">
            {agreementSummary(agreement, currency)}
            {agreement.notes ? ` · ${agreement.notes}` : ''}
          </p>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => {
              fillAgreementForm(agreement)
              setAgreementOpen(true)
            }}
          >
            Alterar valor
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">A receber</CardTitle>
            <CardDescription>Toque em Recebi quando o paciente pagar aquela sessão.</CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              extraChargeForm.reset({ amount: undefined as unknown as number, description: '' })
              setExtraChargeOpen(true)
            }}
          >
            Cobrança extra
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!weekGroups.length ? (
            <EmptyState
              title="Nada em aberto"
              description="Ao agendar uma sessão, o valor aparece aqui para você marcar como pago."
            />
          ) : (
            weekGroups.map((group) => (
              <div key={group.weekOf} className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatWeekLabel(group.weekOf)}</p>
                    <p className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
                      {money(group.dueCents, currency)} nesta semana
                    </p>
                  </div>
                  {agreement.billing_mode === 'weekly' && group.charges.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={paying || group.dueCents <= 0}
                      onClick={() => weekPayMutation.mutate(group.weekOf)}
                    >
                      {weekPayMutation.isPending ? 'Registrando…' : 'Recebi a semana'}
                    </Button>
                  )}
                </div>
                {group.charges.map((charge) => {
                  const remaining = chargeRemainingCents(charge)
                  return (
                    <div
                      key={charge.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-[var(--color-accent)]/40 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{chargeLabel(charge)}</p>
                        <p className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
                          {money(charge.amount_cents, currency)}
                          {charge.amount_paid_cents > 0 && (
                            <> · pago {money(charge.amount_paid_cents, currency)} · falta {money(remaining, currency)}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {charge.status === 'partial' && <Badge variant="secondary">Pago em parte</Badge>}
                        <Button
                          type="button"
                          size="sm"
                          disabled={paying || remaining <= 0}
                          aria-label={`Recebi ${chargeLabel(charge)}`}
                          onClick={() => payChargeMutation.mutate(charge.id)}
                        >
                          {payChargeMutation.isPending ? 'Registrando…' : 'Recebi'}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pagamentos</CardTitle>
          <CardDescription>O que você já registrou. Dá para desfazer se marcou por engano.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!summary.receipts.length ? (
            <EmptyState
              title="Nenhum pagamento ainda"
              description="Quando o paciente pagar, o registro aparece aqui."
            />
          ) : (
            summary.receipts.map((receipt) => (
              <div
                key={receipt.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="min-w-0">
                  <p className="font-medium tabular-nums">{money(receipt.amount_cents, currency)}</p>
                  <p className="truncate text-sm text-[var(--color-muted-foreground)]">
                    {BANKNOTE_METHOD_LABELS[receipt.method]} · {formatDateTime(receipt.paid_at)}
                    {receipt.note ? ` · ${receipt.note}` : ''}
                  </p>
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={() => setReceiptToUndo(receipt)}>
                  Desfazer
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={agreementOpen} onOpenChange={setAgreementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Valor da sessão</DialogTitle>
            <DialogDescription>Isso vale para as próximas sessões deste paciente.</DialogDescription>
          </DialogHeader>
          <form
            className="flex flex-col gap-4"
            onSubmit={agreementForm.handleSubmit((data) => saveAgreement.mutate(data))}
          >
            <AgreementFields form={agreementForm} />
            {saveAgreement.isError && (
              <p className="text-sm text-[var(--color-destructive)]">
                {(saveAgreement.error as Error).message}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAgreementOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveAgreement.isPending}>
                {saveAgreement.isPending ? 'Salvando…' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <PaymentDialog
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        form={paymentForm}
        balanceLabel={money(summary.balanceCents, currency)}
        isPending={partialPayMutation.isPending}
        error={partialPayMutation.error as Error | null}
        onSubmit={(data) => partialPayMutation.mutate(data)}
      />

      <ExtraChargeDialog
        open={extraChargeOpen}
        onOpenChange={setExtraChargeOpen}
        form={extraChargeForm}
        isPending={manualChargeMutation.isPending}
        error={manualChargeMutation.error as Error | null}
        onSubmit={(data) => manualChargeMutation.mutate(data)}
      />

      <Dialog open={!!receiptToUndo} onOpenChange={(open) => !open && setReceiptToUndo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desfazer este pagamento?</DialogTitle>
            <DialogDescription>
              {receiptToUndo
                ? `${money(receiptToUndo.amount_cents, currency)} volta para o que falta receber.`
                : 'O valor volta para o que falta receber.'}
            </DialogDescription>
          </DialogHeader>
          {deleteReceiptMutation.isError && (
            <p className="text-sm text-[var(--color-destructive)]">
              {(deleteReceiptMutation.error as Error).message}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReceiptToUndo(null)}>
              Manter pagamento
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!receiptToUndo || deleteReceiptMutation.isPending}
              onClick={() => receiptToUndo && deleteReceiptMutation.mutate(receiptToUndo.id)}
            >
              {deleteReceiptMutation.isPending ? 'Desfazendo…' : 'Desfazer pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PaymentDialog({
  open,
  onOpenChange,
  form,
  balanceLabel,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: ReturnType<typeof useForm<PaymentForm>>
  balanceLabel: string
  isPending: boolean
  error: Error | null
  onSubmit: (data: PaymentForm) => void
}) {
  const amountId = useId()
  const paidAtId = useId()
  const noteId = useId()
  const method = form.watch('method')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>
            O valor é abatido das sessões mais antigas em aberto. Em aberto agora: {balanceLabel}.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={amountId}>Quanto recebeu</Label>
            <Input
              id={amountId}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              autoComplete="off"
              spellCheck={false}
              {...form.register('amount')}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-[var(--color-destructive)]">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <OptionButtons
            legend="Como pagou"
            value={method}
            onChange={(value) => form.setValue('method', value)}
            options={METHOD_OPTIONS}
            columns={3}
          />
          <div className="flex flex-col gap-2">
            <Label htmlFor={paidAtId}>Quando recebeu</Label>
            <Input id={paidAtId} type="datetime-local" autoComplete="off" {...form.register('paidAt')} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={noteId}>Observação (opcional)</Label>
            <Input
              id={noteId}
              autoComplete="off"
              placeholder="Ex.: pagou metade hoje…"
              {...form.register('note')}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-destructive)]">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Registrando…' : 'Registrar pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ExtraChargeDialog({
  open,
  onOpenChange,
  form,
  isPending,
  error,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  form: ReturnType<typeof useForm<ExtraChargeForm>>
  isPending: boolean
  error: Error | null
  onSubmit: (data: ExtraChargeForm) => void
}) {
  const amountId = useId()
  const descriptionId = useId()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cobrança extra</DialogTitle>
          <DialogDescription>
            Use para um valor que não veio de uma sessão, como material ou deslocamento.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={amountId}>Valor</Label>
            <Input
              id={amountId}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              autoComplete="off"
              spellCheck={false}
              {...form.register('amount')}
            />
            {form.formState.errors.amount && (
              <p className="text-sm text-[var(--color-destructive)]">{form.formState.errors.amount.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={descriptionId}>O que é (opcional)</Label>
            <Input
              id={descriptionId}
              autoComplete="off"
              placeholder="Ex.: deslocamento…"
              {...form.register('description')}
            />
          </div>
          {error && <p className="text-sm text-[var(--color-destructive)]">{error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Adicionando…' : 'Adicionar cobrança'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
