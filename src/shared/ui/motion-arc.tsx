import { cn } from '@/shared/lib/utils'

export function MotionArc({
  className,
  progress,
}: {
  className?: string
  progress?: number
}) {
  const clamped = progress == null ? undefined : Math.min(100, Math.max(0, progress))
  const offset = clamped == null ? undefined : 1 - clamped / 100

  return (
    <svg
      viewBox="0 0 400 400"
      className={cn('motion-arc', className)}
      aria-hidden="true"
    >
      <path
        d="M40 322 C 78 128, 338 72, 372 242"
        fill="none"
        stroke="currentColor"
        strokeWidth="26"
        strokeLinecap="round"
        pathLength={1}
        style={offset == null ? undefined : { strokeDashoffset: offset, animation: 'none' }}
      />
      <path
        d="M86 340 C 116 176, 300 136, 336 268"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        pathLength={1}
        opacity={0.42}
        style={offset == null ? undefined : { strokeDashoffset: offset, animation: 'none' }}
      />
      <path
        d="M118 352 C 148 214, 268 186, 304 286"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        pathLength={1}
        opacity={0.28}
        style={offset == null ? undefined : { strokeDashoffset: offset, animation: 'none' }}
      />
    </svg>
  )
}
