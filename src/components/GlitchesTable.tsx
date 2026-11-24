import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { StatusBadge } from '#/components/StatusBadge.tsx'
import { formatTimestamp } from '#/lib/format.ts'
import type { GlitchListItem } from '#/lib/glitch.ts'

const columns = ['ID', 'Status', 'Description', 'Echoes', 'Timestamp', '']

export function GlitchesTable({ glitches }: { glitches: GlitchListItem[] }) {
  if (glitches.length === 0) {
    return <p className="text-muted">No glitches. Achrona is safe… for now.</p>
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b-2 border-line text-muted">
              {columns.map((col, i) => (
                <th key={i} className="px-5 py-4 font-normal">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-fg">
            {glitches.map((glitch) => (
              <tr key={glitch.glitchId} className="group border-b border-line/60 hover:bg-subtle">
                <td className="px-5 py-4 whitespace-nowrap">
                  <Link
                    to="/glitches/$glitchId"
                    params={{ glitchId: glitch.glitchId }}
                    className="font-medium hover:text-accent"
                  >
                    {glitch.glitchId}
                  </Link>
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={glitch.status} />
                </td>
                <td className="px-5 py-4">{glitch.description}</td>
                <td className="px-5 py-4 text-muted">{glitch.echoCount}</td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {/* Server and browser time zones can differ; the browser's wins. */}
                  <time dateTime={glitch.timestamp} suppressHydrationWarning>
                    {formatTimestamp(glitch.timestamp)}
                  </time>
                </td>
                <td className="px-5 py-4 text-right">
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
