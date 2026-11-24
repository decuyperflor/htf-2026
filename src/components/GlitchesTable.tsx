import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { MonsterIcon } from '#/components/MonsterIcon.tsx'
import { StatusBadge } from '#/components/StatusBadge.tsx'
import { formatTimestamp } from '#/lib/format.ts'
import type { GlitchListItem } from '#/lib/glitch.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'

const columns = ['ID', 'Monster', 'Status', 'Description', 'Sightings', 'Adventurers', 'Spotted', '']

export function GlitchesTable({
  glitches,
  guardians = [],
}: {
  glitches: GlitchListItem[]
  guardians?: GuardianSummary[]
}) {
  if (glitches.length === 0) {
    return <p className="text-muted">No monsters spotted. Achrona is safe… for now.</p>
  }
  const codename = new Map(guardians.map((g) => [g.guardianId, g.codename]))

  return (
    <section className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left">
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
            {glitches.map((glitch) => (
              <tr key={glitch.glitchId} className="group border-b border-line/60 hover:bg-subtle">
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
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
