import { Link } from '@tanstack/react-router'
import { ChevronRight, Coins } from 'lucide-react'
import { MonsterIcon } from '#/components/MonsterIcon.tsx'
import { StatusBadge } from '#/components/StatusBadge.tsx'
import { formatTimestamp } from '#/lib/format.ts'
import { questRank, type GlitchListItem } from '#/lib/glitch.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'

const columns = ['ID', 'Monster', 'Status', 'Description', 'Location', 'Rank', 'Sightings', 'Party', 'Reported', '']

export function GlitchesTable({
  glitches,
  guardians = [],
  selectedId,
  empty = 'No monsters spotted. Achrona is safe… for now.',
}: {
  glitches: GlitchListItem[]
  guardians?: GuardianSummary[]
  /** Row highlighted by keyboard navigation (j/k). */
  selectedId?: string | null
  empty?: string
}) {
  if (glitches.length === 0) {
    return <p className="py-6 text-muted">{empty}</p>
  }
  const codename = new Map(guardians.map((g) => [g.guardianId, g.codename]))

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-left">
        <thead>
          <tr className="border-b-2 border-line text-muted">
            {columns.map((col, i) => (
              <th key={i} className="px-4 py-4 font-normal">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-fg">
          {glitches.map((glitch) => {
            const selected = glitch.glitchId === selectedId
            return (
              <tr
                key={glitch.glitchId}
                data-glitch-id={glitch.glitchId}
                aria-selected={selected}
                className={`group border-b border-line/60 hover:bg-subtle ${selected ? 'bg-accent/10 outline-2 -outline-offset-2 outline-accent' : ''}`}
              >
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link
                    to="/glitches/$glitchId"
                    params={{ glitchId: glitch.glitchId }}
                    className="font-medium hover:text-accent"
                  >
                    {glitch.glitchId}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2 whitespace-nowrap">
                    <MonsterIcon monsterId={glitch.monsterId} className="size-7 shrink-0" />
                    {glitch.monsterName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={glitch.status} />
                </td>
                <td className="px-4 py-3">{glitch.description}</td>
                <td className="px-4 py-3">
                  <span className="whitespace-nowrap">{glitch.locationName}</span>
                  <span className="block text-xs text-muted">{glitch.regionName}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="font-bold">{glitch.monsterId ? questRank(glitch.locationDanger) : '?'}</span>
                  <span className="ml-2 inline-flex items-center gap-0.5 text-xs font-semibold text-[#8A6A2A]">
                    <Coins className="size-3.5" /> {glitch.reward}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted">{glitch.echoCount}</td>
                <td className="px-4 py-3 text-muted">
                  {glitch.assignedGuardianIds.length
                    ? glitch.assignedGuardianIds.map((id) => codename.get(id) ?? `#${id}`).join(', ')
                    : '–'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {/* Server and browser time zones can differ; the browser's wins. */}
                  <time dateTime={glitch.timestamp} suppressHydrationWarning>
                    {formatTimestamp(glitch.timestamp)}
                  </time>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to="/glitches/$glitchId"
                    params={{ glitchId: glitch.glitchId }}
                    aria-label={`Open ${glitch.glitchId}`}
                    className="inline-flex text-muted group-hover:text-fg"
                  >
                    <ChevronRight className="size-5" />
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
