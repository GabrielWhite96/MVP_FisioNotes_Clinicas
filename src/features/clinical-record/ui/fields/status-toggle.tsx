import { cn } from '@/shared/lib/utils'
import { EXAM_STATUS_OPTIONS, type ExamStatus } from '@/entities/clinical-record/model/exam-status'
import { Label } from '@/shared/ui/input'

interface StatusToggleProps {
  label: string
  value: ExamStatus
  onChange: (value: ExamStatus) => void
  id?: string
}

export function StatusToggle({ label, value, onChange, id }: StatusToggleProps) {
  return (
    <div className="space-y-2">
      <Label id={id}>{label}</Label>
      <div className="flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {EXAM_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'rounded-md border px-3 py-1.5 text-sm transition-colors',
              value === opt.value
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'border-[var(--color-border)] hover:bg-[var(--color-accent)]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}
