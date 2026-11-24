import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect } from 'react'
import { WorldMap } from '#/components/world/WorldMap.tsx'
import { getGlitches } from '#/lib/glitches.functions.ts'
import { getGuardians } from '#/lib/guardians.functions.ts'
import { POLL_MS, resilient, usePolling } from '#/lib/polling.ts'
import { getWorld } from '#/lib/world.functions.ts'

export const Route = createFileRoute('/_app/')({
  loader: resilient(async () => {
    const [glitches, guardians, world] = await Promise.all([getGlitches(), getGuardians(), getWorld()])
    return { glitches, guardians, world }
  }),
  component: MapPage,
  // A failed first load (server restart) must not kill the page: keep retrying.
  errorComponent: ReconnectingNotice,
})

/** The map fills the whole screen next to the sidebar. */
const FULL_SCREEN = '-mx-6 -my-8 h-screen p-3 md:-mx-16 md:-my-10'

function ReconnectingNotice() {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => router.invalidate(), POLL_MS)
    return () => clearInterval(id)
  }, [router])
  return (
    <div className={FULL_SCREEN}>
      <div className="flex h-full items-center justify-center rounded-3xl bg-[#7cc8e8] text-[#2b2340]">
        Lost contact with the guild hall – reconnecting…
      </div>
    </div>
  )
}

function MapPage() {
  const { glitches, guardians, world } = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()
  const router = useRouter()
  usePolling()

  return (
    <div className={FULL_SCREEN}>
      <WorldMap glitches={glitches} guardians={guardians} world={world} me={guardian} onChanged={() => router.invalidate()} />
    </div>
  )
}
