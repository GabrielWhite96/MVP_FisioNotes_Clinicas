import { useState } from 'react'
import { addDays, format } from 'date-fns'
import { Input, Label } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { pt } from '@/shared/config/i18n/pt'

interface NextEvaluationPickerProps {
  value: string | null
  onChange: (isoDate: string | null) => void
}

const PRESETS = [
  { days: 30, labelKey: 'days30' as const },
  { days: 60, labelKey: 'days60' as const },
  { days: 90, labelKey: 'days90' as const },
]

export function NextEvaluationPicker({ value, onChange }: NextEvaluationPickerProps) {
  const [custom, setCustom] = useState(false)
  const dateValue = value ? format(new Date(value), 'yyyy-MM-dd') : ''

  const applyPreset = (days: number) => {
    setCustom(false)
    const d = addDays(new Date(), days)
    d.setHours(12, 0, 0, 0)
    onChange(d.toISOString())
  }

  return (
    <div className="space-y-3">
      <Label>{pt.clinicalRecord.nextEvaluation}</Label>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <Button
            key={p.days}
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              !custom &&
                value &&
                Math.abs(new Date(value).getTime() - addDays(new Date(), p.days).setHours(12, 0, 0, 0)) <
                  86_400_000 &&
                'border-[var(--color-primary)]'
            )}
            onClick={() => applyPreset(p.days)}
          >
            {pt.clinicalRecord[p.labelKey]}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(custom && 'border-[var(--color-primary)]')}
          onClick={() => {
            setCustom(true)
            if (!value) onChange(null)
          }}
        >
          {pt.clinicalRecord.customDate}
        </Button>
        {value && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
            {pt.clinicalRecord.clearDate}
          </Button>
        )}
      </div>
      {(custom || value) && (
        <Input
          type="date"
          value={dateValue}
          onChange={(e) => {
            setCustom(true)
            if (!e.target.value) {
              onChange(null)
              return
            }
            const d = new Date(`${e.target.value}T12:00:00`)
            onChange(d.toISOString())
          }}
        />
      )}
    </div>
  )
}
