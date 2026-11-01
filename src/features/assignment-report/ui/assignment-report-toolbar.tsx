import { FileDown } from 'lucide-react'
import { pt } from '@/shared/config/i18n/pt'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'

type PeriodPreset = 'all' | '90d' | '30d'

export function AssignmentReportToolbar({
  from,
  to,
  onFromChange,
  onToChange,
  onPreset,
  onDownload,
  generating,
  disabled,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onPreset: (preset: PeriodPreset) => void
  onDownload: () => void
  generating: boolean
  disabled?: boolean
}) {
  const copy = pt.clinic
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label>{copy.periodFrom}</Label>
        <Input type="date" value={from} onChange={(event) => onFromChange(event.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>{copy.periodTo}</Label>
        <Input type="date" value={to} onChange={(event) => onToChange(event.target.value)} />
      </div>
      <div className="flex gap-1 rounded-lg bg-[var(--color-muted)] p-1">
        {([
          { value: '30d' as const, label: pt.report.period30 },
          { value: '90d' as const, label: pt.report.period90 },
          { value: 'all' as const, label: pt.report.periodAll },
        ]).map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onPreset(item.value)}
            className="rounded-md px-3 py-2 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          >
            {item.label}
          </button>
        ))}
      </div>
      <Button onClick={onDownload} disabled={generating || disabled}>
        <FileDown className="h-4 w-4" />
        {generating ? pt.report.generatingPdf : pt.report.print}
      </Button>
    </div>
  )
}
