import { Link, createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { MagicGauge } from '#/components/MagicGauge.tsx'
import { magicLevel } from '#/lib/magic.ts'
import { Coins, Eye, KanbanSquare, List, ScrollText, Search, Trophy, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { GlitchesTable } from '#/components/GlitchesTable.tsx'
import { QuestBoard } from '#/components/QuestBoard.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { GLITCH_STATUSES, STATUS_LABELS, questRank, type GlitchListItem, type GlitchStatus } from '#/lib/glitch.ts'
import { getGlitches } from '#/lib/glitches.functions.ts'
import { getGuardians } from '#/lib/guardians.functions.ts'
import { resilient, usePolling } from '#/lib/polling.ts'
import { useShortcuts } from '#/lib/shortcuts.ts'
import { getLeaderboard, getWorld } from '#/lib/world.functions.ts'

const SORTS = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  rank: 'Highest rank',
  reward: 'Highest reward',
  sightings: 'Most sightings',
} as const
type SortKey = keyof typeof SORTS
type StatusFilter = 'all' | 'active' | GlitchStatus

/** Filters live in the URL, so they survive opening a quest and coming back (and can be shared). */
type QuestSearch = { q?: string; status?: StatusFilter; region?: string; rank?: number; sort?: SortKey; view?: 'list' }

export const Route = createFileRoute('/_app/quests')({
  validateSearch: (search: Record<string, unknown>): QuestSearch => {
    const status = String(search.status ?? '')
    const sort = String(search.sort ?? '')
    const rank = Number(search.rank)
    return {
      q: typeof search.q === 'string' && search.q ? search.q : undefined,
      status: status === 'active' || (GLITCH_STATUSES as readonly string[]).includes(status) ? (status as StatusFilter) : undefined,
      region: typeof search.region === 'string' && search.region ? search.region : undefined,
      rank: Number.isInteger(rank) && rank >= 1 && rank <= 5 ? rank : undefined,
      sort: sort in SORTS ? (sort as SortKey) : undefined,
      view: search.view === 'list' ? 'list' : undefined,
    }
  },
  loader: resilient(async () => {
    const [glitches, guardians, leaderboard, world] = await Promise.all([
      getGlitches(),
      getGuardians(),
      getLeaderboard(),
      getWorld(),
    ])
    return { glitches, guardians, leaderboard, world }
  }),
  head: () => ({ meta: [{ title: 'Quest board · Achrona Guild' }] }),
  component: QuestBoardPage,
})

function applyFilters(glitches: GlitchListItem[], search: QuestSearch, names: Map<number, string>) {
  const words = (search.q ?? '').toLowerCase().split(/\s+/).filter(Boolean)
  const status = search.status ?? 'all'
  const result = glitches.filter((g) => {
    if (status === 'active' && g.status === 'FIXED') return false
    if (status !== 'all' && status !== 'active' && g.status !== status) return false
    if (search.region && g.regionId !== search.region) return false
    if (search.rank && g.locationDanger !== search.rank) return false
    if (!words.length) return true
    const haystack = [
      g.glitchId,
      g.description,
      g.monsterName,
      g.locationName,
      g.regionName,
      STATUS_LABELS[g.status],
      g.status,
      ...g.assignedGuardianIds.map((id) => names.get(id) ?? ''),
    ]
      .join(' ')
      .toLowerCase()
    return words.every((w) => haystack.includes(w))
  })
  const by: Record<SortKey, (a: GlitchListItem, b: GlitchListItem) => number> = {
    newest: (a, b) => b.timestamp.localeCompare(a.timestamp),
    oldest: (a, b) => a.timestamp.localeCompare(b.timestamp),
    rank: (a, b) => b.locationDanger - a.locationDanger || b.danger - a.danger,
    reward: (a, b) => b.reward - a.reward,
    sightings: (a, b) => b.echoCount - a.echoCount,
  }
  return result.sort(by[search.sort ?? 'newest'])
}

const selectClass = 'rounded-lg border border-line bg-card px-3 py-2 text-sm text-fg'

function QuestBoardPage() {
  const { glitches, guardians, leaderboard, world } = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const router = useRouter()
  const board = search.view !== 'list'
  const searchRef = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  usePolling()

  const names = new Map(guardians.map((g) => [g.guardianId, g.codename]))
  const filteredList = applyFilters(glitches, search, names)
  // On the board, j/k walk column by column (the workflow order).
  const visible = board ? GLITCH_STATUSES.flatMap((s) => filteredList.filter((g) => g.status === s)) : filteredList
  const filtered = Boolean(search.q || search.status || search.region || search.rank)

  function update(patch: Partial<QuestSearch>) {
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true })
  }

  // j/k move through the visible quests, Enter opens one, / jumps to the search box.
  function move(step: number) {
    if (!visible.length) return
    const i = visible.findIndex((g) => g.glitchId === selectedId)
    const next = i === -1 ? (step > 0 ? 0 : visible.length - 1) : Math.min(visible.length - 1, Math.max(0, i + step))
    setSelectedId(visible[next].glitchId)
  }
  useShortcuts({
    j: () => move(1),
    k: () => move(-1),
    ArrowDown: () => move(1),
    ArrowUp: () => move(-1),
    Enter: () => selectedId && navigate({ to: '/glitches/$glitchId', params: { glitchId: selectedId } }),
    o: () => selectedId && navigate({ to: '/glitches/$glitchId', params: { glitchId: selectedId } }),
    '/': () => searchRef.current?.focus(),
  })
  useEffect(() => {
    if (selectedId) document.querySelector(`[data-glitch-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [selectedId])

  return (
    <div className="grid gap-8 2xl:grid-cols-[1fr_18rem]">
      <section className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <h1 className="text-3xl font-semibold text-fg">Quest board</h1>
            <MagicGauge level={magicLevel(glitches)} className="py-1" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/chronicle"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium text-fg hover:bg-subtle"
            >
              <ScrollText className="size-4" />
              Chronicle (PDF)
            </Link>
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
        </div>

        {/* Search + filters */}
        <div className="flex flex-col gap-3 rounded-2xl border border-line bg-card p-4">
          <label className="relative flex items-center">
            <span className="sr-only">Search quests</span>
            <Search className="pointer-events-none absolute left-3 size-4 text-muted" />
            <input
              ref={searchRef}
              type="search"
              value={search.q ?? ''}
              onChange={(e) => update({ q: e.target.value || undefined })}
              onKeyDown={(e) => {
                if (e.key === 'Escape' || e.key === 'Enter') e.currentTarget.blur()
              }}
              placeholder="Search by monster, place, description, adventurer or ID…"
              className="w-full rounded-lg border border-line bg-app py-2 pr-12 pl-9 text-fg outline-none focus:border-accent"
            />
            <kbd className="pointer-events-none absolute right-3 rounded border border-line px-1.5 text-xs text-muted">/</kbd>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Status"
              value={search.status ?? 'all'}
              onChange={(e) => update({ status: e.target.value === 'all' ? undefined : (e.target.value as StatusFilter) })}
              className={selectClass}
            >
              <option value="all">All statuses</option>
              <option value="active">Still at large</option>
              {GLITCH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              aria-label="Region"
              value={search.region ?? ''}
              onChange={(e) => update({ region: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">All regions</option>
              {world.regions.map((r) => (
                <option key={r.regionId} value={r.regionId}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Quest rank"
              value={search.rank ?? ''}
              onChange={(e) => update({ rank: e.target.value ? Number(e.target.value) : undefined })}
              className={selectClass}
            >
              <option value="">All ranks</option>
              {[5, 4, 3, 2, 1].map((d) => (
                <option key={d} value={d}>
                  Rank {questRank(d)}
                </option>
              ))}
            </select>
            <select
              aria-label="Sort"
              value={search.sort ?? 'newest'}
              onChange={(e) => update({ sort: e.target.value === 'newest' ? undefined : (e.target.value as SortKey) })}
              className={selectClass}
            >
              {Object.entries(SORTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <span className="ml-auto text-sm text-muted">
              {visible.length} of {glitches.length} quests
            </span>
            {filtered && (
              <button
                type="button"
                onClick={() => navigate({ search: { view: search.view }, replace: true })}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-accent hover:bg-subtle"
              >
                <X className="size-4" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Board (workflow) or list (table) */}
        <div className="flex items-center gap-1 self-start rounded-lg border border-line bg-card p-1" role="group" aria-label="View">
          {([
            [true, 'Board', KanbanSquare],
            [false, 'List', List],
          ] as const).map(([isBoard, label, Icon]) => (
            <button
              key={label}
              type="button"
              aria-pressed={board === isBoard}
              onClick={() => update({ view: isBoard ? undefined : 'list' })}
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                board === isBoard ? 'bg-accent text-white' : 'text-muted hover:bg-subtle hover:text-fg'
              }`}
            >
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>

        {board ? (
          <QuestBoard
            glitches={filteredList}
            guardians={guardians}
            me={guardian}
            selectedId={selectedId}
            onChanged={() => router.invalidate()}
          />
        ) : (
          <GlitchesTable
            glitches={visible}
            guardians={guardians}
            selectedId={selectedId}
            empty={filtered ? 'No quests match these filters.' : undefined}
          />
        )}
        <p className="text-xs text-muted">
          Tip: <kbd className="rounded border border-line px-1">j</kbd>/<kbd className="rounded border border-line px-1">k</kbd> to move,{' '}
          <kbd className="rounded border border-line px-1">Enter</kbd> to open, <kbd className="rounded border border-line px-1">?</kbd> for all shortcuts.
        </p>
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
                  {row.badges.map((b) => (
                    <span
                      key={b.id}
                      title={`${b.label} – ${b.why}`}
                      aria-label={b.label}
                      className="cursor-help text-base leading-none"
                    >
                      {b.icon}
                    </span>
                  ))}
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
