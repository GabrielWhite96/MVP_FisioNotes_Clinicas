import { cn } from '@/shared/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variant === 'default' && 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
        variant === 'secondary' && 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
        variant === 'destructive' && 'bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)]',
        variant === 'outline' && 'border border-[var(--color-border)]',
        variant === 'success' && 'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]',
        className
      )}
      {...props}
    />
  )
}
