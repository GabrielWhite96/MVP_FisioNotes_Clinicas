import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

interface FormSectionProps {
  step: number
  title: string
  description?: string
  children: ReactNode
  className?: string
  defaultOpen?: boolean
}

/** Visually separated clinical form block with step marker and collapsible body. */
export function FormSection({
  step,
  title,
  description,
  children,
  className,
  defaultOpen = true,
}: FormSectionProps) {
  return (
    <details
      open={defaultOpen}
      className={cn(
        'group overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm',
        className
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/40 px-4 py-3.5 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)]">
          {step}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">{description}</p>
          )}
        </div>
        <span
          aria-hidden
          className="mt-1 text-[var(--color-muted-foreground)] transition-transform group-open:rotate-180"
        >
          ▾
        </span>
      </summary>
      <div className="space-y-4 px-4 py-5 sm:px-5">{children}</div>
    </details>
  )
}
