import { STATUS_LABELS, type GlitchStatus } from '#/lib/glitch.ts'

const styles: Record<GlitchStatus, string> = {
  LEAKED: 'bg-red-50 text-red-700 ring-red-200',
  ASSESSING: 'bg-amber-50 text-amber-700 ring-amber-200',
  CONTAINING: 'bg-blue-50 text-blue-700 ring-blue-200',
  FIXED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
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
