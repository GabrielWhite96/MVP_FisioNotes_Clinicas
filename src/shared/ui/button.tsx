import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-bold transition-[background-color,color,box-shadow,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[inset_0_1px_0_rgb(255_255_255/0.28),0_14px_28px_-12px_rgb(26_167_161/0.7)] hover:bg-[var(--color-ink)] hover:shadow-none',
        destructive:
          'bg-[var(--color-destructive)] text-[var(--color-destructive-foreground)] hover:opacity-90',
        outline:
          'border border-[var(--color-foreground)]/15 bg-[var(--color-card)] hover:border-[var(--color-foreground)]/40 hover:bg-[var(--color-muted)]',
        secondary:
          'bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)] hover:bg-[var(--color-accent)]',
        ghost: 'hover:bg-[var(--color-accent)] hover:text-[var(--color-accent-foreground)]',
        link: 'rounded-none font-bold text-[var(--color-primary)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 min-h-11 px-5 py-2 md:h-10 md:min-h-10',
        sm: 'h-10 min-h-10 rounded-xl px-3.5 md:h-9 md:min-h-9',
        lg: 'h-12 min-h-12 rounded-2xl px-7 text-base',
        icon: 'h-12 w-12 min-h-12 min-w-12 rounded-2xl md:h-10 md:w-10 md:min-h-10 md:min-w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  }
)
Button.displayName = 'Button'

export { buttonVariants }
