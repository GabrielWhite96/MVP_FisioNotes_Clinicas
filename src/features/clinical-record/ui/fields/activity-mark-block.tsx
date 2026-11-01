import { useMemo, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/shared/ui/button'
import { Input, Label } from '@/shared/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { cn } from '@/shared/lib/utils'
import { pt } from '@/shared/config/i18n/pt'

interface ActivityMarkBlockProps {
  label: string
  options: string[]
  items: string[]
  notes: string
  onItemsChange: (items: string[]) => void
  onNotesChange: (notes: string) => void
  onDoneChange: (done: boolean) => void
}

export function ActivityMarkBlock({
  label,
  options,
  items,
  notes,
  onItemsChange,
  onNotesChange,
  onDoneChange,
}: ActivityMarkBlockProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<string[]>(items)
  const [custom, setCustom] = useState('')
  const [showNotes, setShowNotes] = useState(Boolean(notes))

  const catalog = useMemo(() => {
    const set = new Set([...options, ...items])
    return Array.from(set)
  }, [options, items])

  const openDialog = () => {
    setDraft(items)
    setCustom('')
    setOpen(true)
  }

  const toggle = (opt: string) => {
    setDraft((prev) =>
      prev.includes(opt) ? prev.filter((x) => x !== opt) : [...prev, opt]
    )
  }

  const addCustom = () => {
    const value = custom.trim()
    if (!value) return
    setDraft((prev) => (prev.includes(value) ? prev : [...prev, value]))
    setCustom('')
  }

  const confirm = () => {
    onItemsChange(draft)
    onDoneChange(draft.length > 0)
    setOpen(false)
    if (draft.length > 0) setShowNotes(true)
  }

  const removeChip = (opt: string) => {
    const next = items.filter((x) => x !== opt)
    onItemsChange(next)
    onDoneChange(next.length > 0)
  }

  return (
    <div className="space-y-2 rounded-md border border-[var(--color-border)] p-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{label}</Label>
        <Button type="button" size="sm" variant="outline" onClick={openDialog}>
          <Plus className="h-4 w-4" />
          {pt.clinicalRecord.addOrMark}
        </Button>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 text-xs"
            >
              {item}
              <button
                type="button"
                aria-label={`${pt.common.remove} ${item}`}
                onClick={() => removeChip(item)}
                className="rounded-sm opacity-70 hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {pt.clinicalRecord.noItemsMarked}
        </p>
      )}

      {(showNotes || notes) && (
        <Input
          placeholder={pt.clinicalRecord.optionalObservation}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
        />
      )}

      {items.length > 0 && !showNotes && !notes && (
        <button
          type="button"
          className="text-xs text-[var(--color-muted-foreground)] underline-offset-2 hover:underline"
          onClick={() => setShowNotes(true)}
        >
          {pt.clinicalRecord.addObservation}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{label}</DialogTitle>
            <DialogDescription>{pt.clinicalRecord.markDialogHint}</DialogDescription>
          </DialogHeader>

          {catalog.length > 0 ? (
            <div className="flex flex-wrap gap-2 py-2">
              {catalog.map((opt) => {
                const active = draft.includes(opt)
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => toggle(opt)}
                    className={cn(
                      'rounded-md border px-2.5 py-1.5 text-sm',
                      active
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-accent)]'
                    )}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
          ) : (
            <p className="py-2 text-sm text-[var(--color-muted-foreground)]">
              {pt.clinicalRecord.emptyCatalogHint}
            </p>
          )}

          <div className="flex gap-2">
            <Input
              placeholder={pt.clinicalRecord.customItemPlaceholder}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addCustom()
                }
              }}
            />
            <Button type="button" variant="secondary" onClick={addCustom}>
              {pt.common.add}
            </Button>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {pt.common.cancel}
            </Button>
            <Button type="button" onClick={confirm}>
              {pt.common.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
