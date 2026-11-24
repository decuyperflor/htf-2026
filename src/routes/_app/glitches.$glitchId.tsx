import { Link, createFileRoute, notFound, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Coins, MapPin, Swords, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { EchoForm } from '#/components/EchoForm.tsx'
import { DangerStars, MonsterIcon } from '#/components/MonsterIcon.tsx'
import { StatusBadge } from '#/components/StatusBadge.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { Card } from '#/components/ui/Card.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { formatTimestamp } from '#/lib/format.ts'
import { GLITCH_STATUSES, STATUS_LABELS, questRank, type GlitchStatus } from '#/lib/glitch.ts'
import {
  assignAdventurers,
  deleteGlitch,
  getGlitch,
  getGlitches,
  setQuestAccepted,
  updateGlitchStatus,
} from '#/lib/glitches.functions.ts'
import { getGuardians } from '#/lib/guardians.functions.ts'
import { useShortcuts } from '#/lib/shortcuts.ts'

export const Route = createFileRoute('/_app/glitches/$glitchId')({
  loader: async ({ params }) => {
    const [glitch, guardians, all] = await Promise.all([getGlitch({ data: params.glitchId }), getGuardians(), getGlitches()])
    if (!glitch) throw notFound()
    // Quest-board order (newest first), for j/k.
    return { glitch, guardians, order: all.map((g) => g.glitchId) }
  },
  head: ({ params }) => ({ meta: [{ title: `${params.glitchId} · Achrona Guild` }] }),
  notFoundComponent: () => (
    <div className="flex flex-col gap-4">
      <p className="text-fg">This monster isn't on the frontier (anymore).</p>
      <Link to="/" className="text-accent hover:underline">
        Back to the guild hall
      </Link>
    </div>
  ),
  component: GlitchPage,
})

function GlitchPage() {
  const { glitch, guardians, order } = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const index = order.indexOf(glitch.glitchId)
  const go = (step: number) => {
    const next = order[index + step]
    if (next) router.navigate({ to: '/glitches/$glitchId', params: { glitchId: next } })
  }
  useShortcuts({ j: () => go(1), k: () => go(-1), u: () => router.navigate({ to: '/quests' }) })

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
    if (!confirm(`Remove ${glitch.glitchId} and all its sightings?`)) return
    try {
      await deleteGlitch({ data: glitch.glitchId })
      await router.navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove monster')
    }
  }

  async function toggleQuest(accepted: boolean) {
    setError(null)
    try {
      await setQuestAccepted({ data: { glitchId: glitch.glitchId, accepted } })
      await router.invalidate()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update quest')
    }
  }

  const onQuest = glitch.assignments.some((a) => a.guardianId === guardian?.guardianId)
  const canAccept = can(guardian, PERMISSIONS.questAccept) && glitch.status !== 'FIXED'
  const canStatus = can(guardian, PERMISSIONS.glitchUpdateStatus)
  const canAssign = can(guardian, PERMISSIONS.glitchAssign)
  const canDelete = can(guardian, PERMISSIONS.glitchDelete)

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <Link to="/quests" className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" /> Quest board
      </Link>
      <p className="-mt-6 text-xs text-muted">
        Quest {index + 1} of {order.length} · <kbd className="rounded border border-line px-1">j</kbd>/<kbd className="rounded border border-line px-1">k</kbd> next/previous ·{' '}
        <kbd className="rounded border border-line px-1">u</kbd> back
      </p>

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex size-24 shrink-0 items-center justify-center rounded-2xl bg-[#120c2e]">
          <MonsterIcon monsterId={glitch.monsterId} className="size-20" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold text-fg">{glitch.glitchId}</h1>
            <StatusBadge status={glitch.status} />
          </div>
          <p className="flex items-center gap-2 text-fg">
            <span className="font-medium">{glitch.monsterName}</span>
            <DangerStars danger={glitch.danger} />
          </p>
          <p className="text-lg text-fg">{glitch.description}</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-3 py-1 text-fg">
              <MapPin className="size-4" /> {glitch.locationName} · {glitch.regionName}
            </span>
            <span className="rounded-full bg-[#2b2340] px-3 py-1 font-bold text-white">
              Rank {questRank(glitch.locationDanger)}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#ffcf4d]/25 px-3 py-1 font-bold text-[#8a6420]">
              <Coins className="size-4" /> {glitch.reward} gold
            </span>
          </div>
          <p className="text-sm text-muted">
            Spotted on{' '}
            <time dateTime={glitch.timestamp} suppressHydrationWarning>
              {formatTimestamp(glitch.timestamp)}
            </time>
          </p>
        </div>
      </div>

      {(canStatus || canDelete) && (
        <Card className="flex flex-wrap items-end justify-between gap-4 p-5">
          {canStatus && (
            <label className="flex flex-col gap-1.5 text-sm text-fg">
              Status
              <select
                value={glitch.status}
                onChange={(e) => changeStatus(e.target.value as GlitchStatus)}
                className="rounded-lg border border-line bg-card px-3 py-2 text-fg"
              >
                {GLITCH_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]} ({s})
                  </option>
                ))}
              </select>
            </label>
          )}
          {canDelete && (
            <Button variant="danger" onClick={remove}>
              <Trash2 className="size-4" /> Remove monster
            </Button>
          )}
        </Card>
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold text-fg">Quest party</h2>
          {canAccept && (
            <Button variant={onQuest ? 'secondary' : 'primary'} onClick={() => toggleQuest(!onQuest)}>
              <Swords className="size-4" /> {onQuest ? 'Leave quest' : 'Accept quest'}
            </Button>
          )}
        </div>
        {canAssign ? (
          <AssignPanel
            glitchId={glitch.glitchId}
            adventurers={guardians.filter((g) => g.roleId === 'defender')}
            assigned={glitch.assignments.map((a) => a.guardianId)}
            onError={setError}
          />
        ) : glitch.assignments.length ? (
          <p className="text-fg">{glitch.assignments.map((a) => a.codename).join(', ')}</p>
        ) : (
          <p className="text-muted">The guild hasn't sent anyone yet.</p>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-fg">Sightings ({glitch.echoes.length})</h2>
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
          <h2 className="text-xl font-semibold text-fg">Report another sighting</h2>
          <p className="-mt-2 text-sm text-muted">Every sighting makes the monster grow on the frontier.</p>
          <EchoForm
            glitchId={glitch.glitchId}
            submitLabel="Add sighting"
            onReported={() => router.invalidate()}
          />
        </section>
      )}
    </div>
  )
}

function AssignPanel({
  glitchId,
  adventurers,
  assigned,
  onError,
}: {
  glitchId: string
  adventurers: { guardianId: number; codename: string }[]
  assigned: number[]
  onError: (message: string | null) => void
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<number[]>(assigned)
  const [pending, setPending] = useState(false)
  // Follow the server after a save or when someone else changed it.
  const assignedKey = [...assigned].sort().join(',')
  useEffect(() => setSelected(assigned), [assignedKey])

  const dirty = [...selected].sort().join(',') !== assignedKey

  async function save() {
    setPending(true)
    onError(null)
    try {
      await assignAdventurers({ data: { glitchId, guardianIds: selected } })
      await router.invalidate()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not send adventurers')
    } finally {
      setPending(false)
    }
  }

  if (adventurers.length === 0) return <p className="text-muted">There are no adventurers in the guild.</p>

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex flex-wrap gap-2">
        {adventurers.map((a) => {
          const on = selected.includes(a.guardianId)
          return (
            <label
              key={a.guardianId}
              className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent ${
                on ? 'border-accent bg-accent/10 text-fg' : 'border-line text-muted hover:bg-subtle'
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() =>
                  setSelected((s) => (on ? s.filter((id) => id !== a.guardianId) : [...s, a.guardianId]))
                }
                className="accent-accent"
              />
              {a.codename}
            </label>
          )
        })}
      </div>
      <div>
        <Button onClick={save} disabled={pending || !dirty}>
          <Swords className="size-4" />
          {pending ? 'Sending…' : 'Send out'}
        </Button>
      </div>
    </Card>
  )
}
