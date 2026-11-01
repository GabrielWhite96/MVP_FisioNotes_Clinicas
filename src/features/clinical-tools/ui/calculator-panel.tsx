import { useState, type FormEvent } from 'react'
import { pt } from '@/shared/config/i18n/pt'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import type { CalculatorOutcome, ClinicalTool } from '../model/types'
import { isInteractiveTool } from '../model/types'

const fieldClass =
  'flex h-10 w-full rounded-md border border-[var(--color-input)] bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]'

export function CalculatorPanel({ tool }: { tool: ClinicalTool }) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [outcome, setOutcome] = useState<CalculatorOutcome | null>(null)

  if (!isInteractiveTool(tool)) return null

  const visibleFields = tool.fields.filter((field) => {
    if (!field.visibleWhen) return true
    return values[field.visibleWhen.id] === field.visibleWhen.value
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setOutcome(tool.compute(values))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-[var(--color-card)] p-4">
      <h2 className="text-sm font-semibold">{pt.tools.calculate}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {visibleFields.map((field) => {
          const inputId = `tool-${tool.id}-${field.id}`
          return (
            <div key={field.id} className="space-y-2">
              <Label htmlFor={inputId}>
                {field.label}
                {field.unit ? ` (${field.unit})` : ''}
                {!field.required ? ` — ${pt.tools.optional}` : ''}
              </Label>
              {field.input === 'select' ? (
                <select
                  id={inputId}
                  className={fieldClass}
                  value={values[field.id] ?? ''}
                  onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                >
                  <option value="">{pt.tools.selectPlaceholder}</option>
                  {field.options?.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <Input
                  id={inputId}
                  inputMode="decimal"
                  value={values[field.id] ?? ''}
                  onChange={(event) => setValues((current) => ({ ...current, [field.id]: event.target.value }))}
                />
              )}
              {field.help && <p className="text-xs text-[var(--color-muted-foreground)]">{field.help}</p>}
            </div>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Button type="submit">{pt.tools.calculate}</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValues({})
            setOutcome(null)
          }}
        >
          {pt.tools.clear}
        </Button>
      </div>
      {outcome && 'error' in outcome && (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">{outcome.error}</p>
      )}
      {outcome && !('error' in outcome) && (
        <div aria-live="polite" className="space-y-3 rounded-lg bg-[var(--color-muted)] p-4">
          <h3 className="text-sm font-semibold">{pt.tools.result}</h3>
          <dl className="space-y-2">
            {outcome.lines.map((line) => (
              <div key={line.label}>
                <dt className="text-xs text-[var(--color-muted-foreground)]">{line.label}</dt>
                <dd className="text-lg font-semibold">{line.value}</dd>
                {line.detail && <dd className="text-xs text-[var(--color-muted-foreground)]">{line.detail}</dd>}
              </div>
            ))}
          </dl>
          <p className="text-sm">{outcome.explanation}</p>
          {outcome.limitations.length > 0 && (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {outcome.limitations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          )}
        </div>
      )}
    </form>
  )
}
