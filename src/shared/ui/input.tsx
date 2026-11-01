import * as React from 'react'
import { cn } from '@/shared/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-12 w-full rounded-2xl border-0 bg-[var(--color-muted)] px-4 py-2 text-base file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-muted-foreground)] transition-[background-color,box-shadow] duration-150 focus-visible:bg-[var(--color-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50 md:h-11 md:text-sm',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export const Label = React.forwardRef<HTMLLabelElement, React.LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => (
    <label ref={ref} className={cn('text-sm font-medium leading-none', className)} {...props} />
  )
)
Label.displayName = 'Label'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-2xl border-0 bg-[var(--color-muted)] px-4 py-3 text-base placeholder:text-[var(--color-muted-foreground)] transition-[background-color,box-shadow] duration-150 focus-visible:bg-[var(--color-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
