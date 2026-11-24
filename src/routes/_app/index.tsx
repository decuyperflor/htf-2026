import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Coins, Eye, Trophy } from 'lucide-react'
import { useEffect } from 'react'
import { GlitchesTable } from '#/components/GlitchesTable.tsx'
import { WorldMap } from '#/components/world/WorldMap.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'
import { getGuardians } from '#/lib/guardians.functions.ts'
import { getLeaderboard, getWorld } from '#/lib/world.functions.ts'

/** How often the dashboard asks the server for the latest state. */
const POLL_MS = 3000

export const Route = createFileRoute('/_app/')({
  loader: async () => {
    const [glitches, guardians, world, leaderboard] = await Promise.all([
      getGlitches(),
      getGuardians(),
      getWorld(),
      getLeaderboard(),
    ])
    return { glitches, guardians, world, leaderboard }
  },
  component: DashboardPage,
  // A failed poll (server restart, network blip) must not kill the dashboard: keep retrying.
  errorComponent: ReconnectingNotice,
})

function ReconnectingNotice() {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.invalidate(), POLL_MS)
    return () => clearInterval(id)
  }, [router])
  return (
    <div className="flex h-[62vh] min-h-[360px] items-center justify-center rounded-3xl bg-[#7cc8e8] text-[#2b2340]">
      Lost contact with the guild hall – reconnecting…
    </div>
  )
}

function DashboardPage() {
  const { glitches, guardians, world, leaderboard } = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()
  const router = useRouter()

  // Live updates: re-run the loader every few seconds while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.invalidate()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [router])

  if (!guardian) return null

  return (
    <div className="flex flex-col gap-8">
      <section className="h-[62vh] min-h-[360px]">
        <WorldMap
          glitches={glitches}
          guardians={guardians}
          world={world}
          me={guardian}
          onChanged={() => router.invalidate()}
        />
      </section>

      <div className="grid gap-8 xl:grid-cols-[1fr_18rem]">
        <section className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-fg">Quest board</h2>
            {can(guardian, PERMISSIONS.echoCreate) && (
              <Link
                to="/report"
                className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
              >
                <Eye className="size-4" />
                Spot a monster
              </Link>
            )}
          </div>
          <GlitchesTable glitches={glitches} guardians={guardians} />
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="flex items-center gap-2 text-2xl font-semibold text-fg">
            <Trophy className="size-6 text-[#b8862f]" /> Leaderboard
          </h2>
          <ol className="flex flex-col divide-y divide-line rounded-xl border border-line bg-card">
            {leaderboard.map((row, i) => (
              <li
                key={row.guardianId}
                className={`flex items-center gap-3 px-4 py-3 text-sm ${row.guardianId === guardian.guardianId ? 'bg-accent/5' : ''}`}
              >
                <span className="w-5 text-center font-bold text-muted">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                <span className="flex-1 font-medium text-fg">{row.codename}</span>
                <span className="text-xs text-muted">{row.slain} slain</span>
                <span className="flex items-center gap-1 font-bold text-[#b8862f]">
                  <Coins className="size-4" /> {row.gold}
                </span>
              </li>
            ))}
            {!leaderboard.length && <li className="px-4 py-3 text-sm text-muted">No adventurers yet.</li>}
          </ol>
        </section>
      </div>
    </div>
  )
}
