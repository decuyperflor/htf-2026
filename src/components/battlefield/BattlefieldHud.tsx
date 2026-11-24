import { GLITCH_STATUSES, type GlitchListItem, type GlitchStatus } from '#/lib/glitch.ts'

const legend: Record<GlitchStatus, { label: string; icon: React.ReactNode }> = {
  LEAKED: {
    label: 'Leaked – on the move',
    icon: <polygon points="2,8 12,2 12,14" fill="#1a0b2e" stroke="#ff4d8d" strokeWidth={1.5} />,
  },
  ASSESSING: {
    label: 'Assessing – targeted',
    icon: <circle cx={8} cy={8} r={6} fill="none" stroke="#ff3b3b" strokeWidth={1.5} />,
  },
  CONTAINING: {
    label: 'Containing – caged',
    icon: <rect x={2} y={2} width={12} height={12} rx={1.5} fill="none" stroke="#2de2ff" strokeWidth={1.5} />,
  },
  FIXED: {
    label: 'Fixed – destroyed',
    icon: <circle cx={8} cy={8} r={6} fill="#ffb547" />,
  },
}

/** Title, live counters and legend on top of the battlefield. */
export function BattlefieldHud({ glitches }: { glitches: GlitchListItem[] }) {
  const counts = Object.fromEntries(GLITCH_STATUSES.map((s) => [s, 0])) as Record<GlitchStatus, number>
  for (const g of glitches) counts[g.status]++
  const active = glitches.length - counts.FIXED

  return (
    <>
      <div className="pointer-events-none absolute top-4 left-5 flex items-center gap-3">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
        </span>
        <h1 className="text-sm font-semibold tracking-[0.2em] text-white/90 uppercase">Battlefield</h1>
        <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/80">
          {active} active
        </span>
      </div>

      <ul className="pointer-events-none absolute right-4 bottom-3 hidden flex-col gap-1 rounded-xl bg-black/30 px-3 py-2 text-xs text-white/80 backdrop-blur-sm md:flex">
        {GLITCH_STATUSES.map((s) => (
          <li key={s} className="flex items-center gap-2">
            <svg viewBox="0 0 16 16" className="size-3.5" aria-hidden="true">
              {legend[s].icon}
            </svg>
            <span className="flex-1">{legend[s].label}</span>
            <span className="tabular-nums text-white/60">{counts[s]}</span>
          </li>
        ))}
      </ul>
    </>
  )
}
