import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/utils'

function PageHeaderRoot({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <header className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', className)}>
      {children}
    </header>
  )
}

function PageHeaderCopy({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-w-0', className)}>{children}</div>
}

function PageHeaderTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <h1 className={cn('page-title', className)}>{children}</h1>
}

function PageHeaderDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('page-kicker', className)}>{children}</p>
}

function PageHeaderActions({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex flex-wrap gap-2', className)}>{children}</div>
}

export const PageHeader = {
  Root: PageHeaderRoot,
  Copy: PageHeaderCopy,
  Title: PageHeaderTitle,
  Description: PageHeaderDescription,
  Actions: PageHeaderActions,
}
