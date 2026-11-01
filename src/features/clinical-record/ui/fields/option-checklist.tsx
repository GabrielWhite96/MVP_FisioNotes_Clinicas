import { useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { pt } from '@/shared/config/i18n/pt'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

interface OptionChecklistProps {
  options: string[]
  selected: string[]
  onChange: (next: string[]) => void
}

export function OptionChecklist({ options, selected, onChange }: OptionChecklistProps) {
  const [custom, setCustom] = useState('')
  const extras = selected.filter((item) => !options.includes(item))
  const chips = [...options, ...extras]

  const toggle = (opt: string) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt))
    } else {
      onChange([...selected, opt])
    }
  }

  const addCustom = () => {
    const value = custom.trim()
    if (!value || selected.includes(value)) {
      setCustom('')
      return
    }
    onChange([...selected, value])
    setCustom('')
  }

  if (!chips.length && !options.length) {
    return (
      <div className="flex gap-2">
        <Input
          value={custom}
          placeholder={pt.clinicalRecord.other}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addCustom}>
          {pt.common.add}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {chips.map((opt) => {
          const active = selected.includes(opt)
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                'rounded-md border px-2.5 py-1 text-xs',
                active
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                  : 'border-[var(--color-border)]'
              )}
            >
              {opt}
            </button>
          )
        })}
      </div>
      <div className="flex gap-2">
        <Input
          value={custom}
          placeholder={pt.clinicalRecord.other}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addCustom()
            }
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={addCustom}>
          {pt.common.add}
        </Button>
      </div>
    </div>
  )
}
