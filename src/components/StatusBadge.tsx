import { STATUS_LABELS, type GlitchStatus } from '#/lib/glitch.ts'

const styles: Record<GlitchStatus, string> = {
  LEAKED: 'bg-cyan-50 text-cyan-800 ring-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900',
  ASSESSING: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-900',
  CONTAINING: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-900',
  FIXED: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-900',
}

/** Shows the guild-themed label; the original status name is in the tooltip. */
export function StatusBadge({ status }: { status: GlitchStatus }) {
  return (
    <span
      title={status}
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium tracking-wide ring-1 ring-inset ${styles[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
