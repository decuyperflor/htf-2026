import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { useEffect } from 'react'
import { GlitchesTable } from '#/components/GlitchesTable.tsx'
import { Battlefield } from '#/components/battlefield/Battlefield.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'
import { getGuardians } from '#/lib/guardians.functions.ts'

/** How often the dashboard asks the server for the latest state. */
const POLL_MS = 3000

export const Route = createFileRoute('/_app/')({
  loader: async () => {
    const [glitches, guardians] = await Promise.all([getGlitches(), getGuardians()])
    return { glitches, guardians }
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
    <div className="flex h-[42vh] min-h-[300px] items-center justify-center rounded-3xl bg-[#120c2e] text-white/70">
      Lost contact with the guild hall – reconnecting…
    </div>
  )
}

function DashboardPage() {
  const { glitches, guardians } = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()
  const router = useRouter()

  // Live updates: re-run the loader every few seconds while the tab is visible.
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.invalidate()
    }, POLL_MS)
    return () => clearInterval(id)
  }, [router])

  return (
    <div className="flex flex-col gap-8">
      <section className="h-[42vh] min-h-[300px]">
        <Battlefield glitches={glitches} guardians={guardians} />
      </section>

      <section className="flex flex-col gap-4">
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
    </div>
  )
}
