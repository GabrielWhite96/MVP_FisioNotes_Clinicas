import { BRAND_LOGOS, BRAND_NAME, type BrandLogoLayout } from '@/shared/config/brand'
import { cn } from '@/shared/lib/utils'

const sizeStyles = {
  sm: {
    icon: 'h-8 w-8',
    horizontal: 'h-7 sm:h-8',
    stacked: 'h-20',
    plate: 'rounded-xl px-2 py-1',
  },
  md: {
    icon: 'h-9 w-9',
    horizontal: 'h-9',
    stacked: 'h-28',
    plate: 'rounded-xl px-2.5 py-1.5',
  },
  lg: {
    icon: 'h-12 w-12',
    horizontal: 'h-10 lg:h-11',
    stacked: 'h-32 sm:h-40',
    plate: 'rounded-2xl px-3 py-2',
  },
} as const

export function BrandMark({
  size = 'md',
  layout = 'horizontal',
  tone = 'default',
  className,
  alt = BRAND_NAME,
}: {
  size?: keyof typeof sizeStyles
  layout?: BrandLogoLayout
  tone?: 'default' | 'onDark'
  className?: string
  alt?: string
}) {
  const mark = (
    <img
      src={BRAND_LOGOS[layout]}
      alt={alt}
      className={cn(
        'w-auto max-w-full object-contain object-left',
        sizeStyles[size][layout],
        tone === 'default' && 'shrink-0 self-start',
        tone === 'default' && className
      )}
    />
  )

  if (tone !== 'onDark') return mark

  return (
    <span
      className={cn(
        'brand-glass inline-flex max-w-full shrink-0 self-start',
        sizeStyles[size].plate,
        className
      )}
    >
      {mark}
    </span>
  )
}
