import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { EchoForm } from '#/components/EchoForm.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { getMonsters } from '#/lib/monsters.functions.ts'
import { getWorld } from '#/lib/world.functions.ts'

export const Route = createFileRoute('/_app/report')({
  // ?location=… preselects the place (clicked on the map).
  validateSearch: (search: Record<string, unknown>): { location?: string } =>
    typeof search.location === 'string' ? { location: search.location } : {},
  beforeLoad: ({ context }) => {
    if (!can(context.guardian, PERMISSIONS.echoCreate)) throw redirect({ to: '/' })
  },
  loader: async () => {
    const [monsters, world] = await Promise.all([getMonsters(), getWorld()])
    return { monsters, world }
  },
  head: () => ({ meta: [{ title: 'Spot a monster · Achrona Guild' }] }),
  component: ReportPage,
})

function ReportPage() {
  const router = useRouter()
  const { monsters, world } = Route.useLoaderData()
  const { location } = Route.useSearch()
  const { guardian } = Route.useRouteContext()

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-fg">Spot a monster</h1>
        <p className="mt-2 text-muted">
          Every sighting you report puts a new monster on the world map, at the spot where you saw it. Adventurers can then take on the quest.
        </p>
      </div>
      <EchoForm
        monsters={monsters}
        world={world}
        initialLocationId={location}
        showRewards={can(guardian, PERMISSIONS.locationManage)}
        submitLabel="Report monster"
        onReported={(glitchId) =>
          router.navigate({ to: '/glitches/$glitchId', params: { glitchId } })
        }
      />
    </div>
  )
}
