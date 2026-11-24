import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { GlitchesTable } from '#/components/GlitchesTable.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'

export const Route = createFileRoute('/_app/')({
  loader: () => getGlitches(),
  component: OverviewPage,
})

function OverviewPage() {
  const glitches = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold text-fg">Overview</h1>
        {can(guardian, PERMISSIONS.echoCreate) && (
          <Link
            to="/report"
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
          >
            <Plus className="size-4" />
            Report echo
          </Link>
        )}
      </div>
      <GlitchesTable glitches={glitches} />
    </div>
  )
}
