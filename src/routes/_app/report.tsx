import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { EchoForm } from '#/components/EchoForm.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { getMonsters } from '#/lib/monsters.functions.ts'

export const Route = createFileRoute('/_app/report')({
  beforeLoad: ({ context }) => {
    if (!can(context.guardian, PERMISSIONS.echoCreate)) throw redirect({ to: '/' })
  },
  loader: () => getMonsters(),
  head: () => ({ meta: [{ title: 'Spot a monster · Achrona Guild' }] }),
  component: ReportPage,
})

function ReportPage() {
  const router = useRouter()
  const monsters = Route.useLoaderData()

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-fg">Spot a monster</h1>
        <p className="mt-2 text-muted">
          Every sighting you report puts a new monster on the frontier. The guild decides who to send out.
        </p>
      </div>
      <EchoForm
        monsters={monsters}
        submitLabel="Report monster"
        onReported={(glitchId) =>
          router.navigate({ to: '/glitches/$glitchId', params: { glitchId } })
        }
      />
    </div>
  )
}
