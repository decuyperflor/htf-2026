import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { EchoForm } from '#/components/EchoForm.tsx'
import { StatusBadge } from '#/components/StatusBadge.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { Card } from '#/components/ui/Card.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { formatTimestamp } from '#/lib/format.ts'
import { GLITCH_STATUSES, type GlitchStatus } from '#/lib/glitch.ts'
import { deleteGlitch, getGlitch, updateGlitchStatus } from '#/lib/glitches.functions.ts'

export const Route = createFileRoute('/_app/glitches/$glitchId')({
  loader: async ({ params }) => {
    const glitch = await getGlitch({ data: params.glitchId })
    if (!glitch) throw notFound()
    return glitch
  },
  head: ({ params }) => ({ meta: [{ title: `${params.glitchId} · Control Center` }] }),
  notFoundComponent: () => (
    <div className="flex flex-col gap-4">
      <p className="text-fg">This glitch doesn't exist (anymore).</p>
      <Link to="/" className="text-accent hover:underline">
        Back to overview
      </Link>
    </div>
  ),
  component: GlitchPage,
})

function GlitchPage() {
  const glitch = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  async function changeStatus(status: GlitchStatus) {
    setError(null)
    try {
      await updateGlitchStatus({ data: { glitchId: glitch.glitchId, status } })
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status')
    }
  }

  async function remove() {
    if (!confirm(`Delete ${glitch.glitchId} and all its echoes?`)) return
    try {
      await deleteGlitch({ data: glitch.glitchId })
      await router.navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete glitch')
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Overview
      </Link>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold text-fg">{glitch.glitchId}</h1>
          <StatusBadge status={glitch.status} />
        </div>
        <p className="text-lg text-fg">{glitch.description}</p>
        <p className="text-sm text-muted">
          Leaked on{' '}
          <time dateTime={glitch.timestamp} suppressHydrationWarning>
            {formatTimestamp(glitch.timestamp)}
          </time>
        </p>
      </div>

      {(can(guardian, PERMISSIONS.glitchUpdateStatus) ||
        can(guardian, PERMISSIONS.glitchDelete)) && (
        <Card className="flex flex-wrap items-end justify-between gap-4 p-5">
          {can(guardian, PERMISSIONS.glitchUpdateStatus) && (
            <label className="flex flex-col gap-1.5 text-sm text-fg">
              Status
              <select
                value={glitch.status}
                onChange={(e) => changeStatus(e.target.value as GlitchStatus)}
                className="rounded-lg border border-line bg-white px-3 py-2"
              >
                {GLITCH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          {can(guardian, PERMISSIONS.glitchDelete) && (
            <Button variant="danger" onClick={remove}>
              <Trash2 className="size-4" /> Delete glitch
            </Button>
          )}
        </Card>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-fg">Echoes ({glitch.echoes.length})</h2>
        <ol className="flex flex-col gap-3">
          {glitch.echoes.map((echo) => (
            <li key={echo.echoId} className="rounded-xl border border-line p-4">
              <p className="text-fg">{echo.description}</p>
              <p className="mt-2 text-sm text-muted">
                {echo.reporterCodename} ·{' '}
                <time dateTime={echo.timestamp} suppressHydrationWarning>
                  {formatTimestamp(echo.timestamp)}
                </time>
              </p>
            </li>
          ))}
        </ol>
      </section>

      {can(guardian, PERMISSIONS.echoCreate) && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-semibold text-fg">Add an echo to this glitch</h2>
          <EchoForm
            glitchId={glitch.glitchId}
            submitLabel="Add echo"
            onReported={() => router.invalidate()}
          />
        </section>
      )}
    </div>
  )
}
