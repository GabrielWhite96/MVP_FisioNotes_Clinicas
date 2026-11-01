/** Currency helpers — never hardcode display currency in UI components. */

const DEFAULT_CURRENCY = 'CAD'
const DEFAULT_LOCALE = 'en-CA'

export function formatMoney(
  amountCents: number,
  currency: string = DEFAULT_CURRENCY,
  locale: string = DEFAULT_LOCALE
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amountCents / 100)
}

export function centsToUnits(amountCents: number): number {
  return amountCents / 100
}
