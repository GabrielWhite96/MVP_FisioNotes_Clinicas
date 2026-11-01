import { cn } from '@/shared/lib/utils'
import { Input, Label } from '@/shared/ui/input'

interface YesNoDetailProps {
  label: string
  yes: boolean | null
  detail: string
  detailPlaceholder?: string
  onYesChange: (yes: boolean | null) => void
  onDetailChange: (detail: string) => void
}

export function YesNoDetail({
  label,
  yes,
  detail,
  detailPlaceholder = 'Qual?',
  onYesChange,
  onDetailChange,
}: YesNoDetailProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {[
          { value: true, text: 'Sim' },
          { value: false, text: 'Não' },
        ].map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onYesChange(opt.value)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              yes === opt.value
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-accent)]'
            )}
          >
            {opt.text}
          </button>
        ))}
      </div>
      {yes === true && (
        <Input
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailPlaceholder}
        />
      )}
    </div>
  )
}
