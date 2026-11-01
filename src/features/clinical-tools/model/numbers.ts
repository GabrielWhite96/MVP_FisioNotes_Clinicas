import type { CalculatorValues } from './types'

export function parseFieldNumber(raw: string | undefined): number | null {
  if (raw == null) return null
  const normalized = raw.trim().replace(',', '.')
  if (!normalized) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export function formatNumber(value: number, digits = 1): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function requireNumber(
  values: CalculatorValues,
  id: string,
  label: string,
  bounds?: { min?: number; max?: number; integer?: boolean },
): number | { error: string } {
  const parsed = parseFieldNumber(values[id])
  if (parsed == null) return { error: `Informe ${label}.` }
  if (bounds?.integer && !Number.isInteger(parsed)) {
    return { error: `${label}: informe um número inteiro.` }
  }
  if (bounds?.min != null && parsed < bounds.min) {
    return { error: `${label}: o mínimo aceito neste campo é ${formatNumber(bounds.min, 0)}.` }
  }
  if (bounds?.max != null && parsed > bounds.max) {
    return { error: `${label}: o máximo aceito neste campo é ${formatNumber(bounds.max, 0)}.` }
  }
  return parsed
}

export function isFieldError(value: number | { error: string }): value is { error: string } {
  return typeof value === 'object'
}
