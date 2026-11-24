import { Link, createFileRoute } from '@tanstack/react-router'
import { Coins, Eye, Trophy } from 'lucide-react'
import { GlitchesTable } from '#/components/GlitchesTable.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'
import { getGuardians } from '#/lib/guardians.functions.ts'
import { resilient, usePolling } from '#/lib/polling.ts'
import { getLeaderboard } from '#/lib/world.functions.ts'

export const Route = createFileRoute('/_app/quests')({
  loader: resilient(async () => {
    const [glitches, guardians, leaderboard] = await Promise.all([getGlitches(), getGuardians(), getLeaderboard()])
    return { glitches, guardians, leaderboard }
  }),
  head: () => ({ meta: [{ title: 'Quest board · Achrona Guild' }] }),
  component: QuestBoardPage,
})

function QuestBoardPage() {
  const { glitches, guardians, leaderboard } = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()
  usePolling()

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_18rem]">
      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold text-fg">Quest board</h1>
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
          {leaderboard.map((row, i) => {
            const online = guardians.find((g) => g.guardianId === row.guardianId)?.online
            return (
              <li
                key={row.guardianId}
                className={`flex items-center gap-3 px-4 py-3 text-sm ${row.guardianId === guardian.guardianId ? 'bg-accent/5' : ''}`}
              >
                <span className="w-5 text-center font-bold text-muted">{['🥇', '🥈', '🥉'][i] ?? i + 1}</span>
                <span className="flex flex-1 items-center gap-1.5 font-medium text-fg">
                  <span
                    className={`size-2 rounded-full ${online ? 'bg-emerald-500' : 'bg-line'}`}
                    title={online ? 'Online' : 'Offline'}
                  />
                  {row.codename}
                </span>
                <span className="text-xs text-muted">{row.slain} slain</span>
                <span className="flex items-center gap-1 font-bold text-[#b8862f]">
                  <Coins className="size-4" /> {row.gold}
                </span>
              </li>
            )
          })}
          {!leaderboard.length && <li className="px-4 py-3 text-sm text-muted">No adventurers yet.</li>}
        </ol>
      </section>
    </div>
  )
}
