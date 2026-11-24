import { Link } from '@tanstack/react-router'
import { ArrowRight, Coins, Eye } from 'lucide-react'
import { useState, type DragEvent } from 'react'
import { MonsterIcon } from '#/components/MonsterIcon.tsx'
import { QuestActions } from '#/components/quest/QuestActions.tsx'
import { PERMISSIONS, can, type SessionGuardian } from '#/lib/auth.ts'
import { formatTimestamp } from '#/lib/format.ts'
import { GLITCH_STATUSES, STATUS_LABELS, questRank, type GlitchListItem, type GlitchStatus } from '#/lib/glitch.ts'
import { updateGlitchStatus } from '#/lib/glitches.functions.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'

/** The workflow, one column per step, worded like a guild would. */
const COLUMNS: Record<GlitchStatus, { title: string; hint: string; sign: string }> = {
  LEAKED: { title: 'Scouting', hint: 'Villagers report trouble – who investigates?', sign: '#1E6F7C' },
  ASSESSING: { title: 'Spotted', hint: 'Monster identified – the guild sets the bounty', sign: '#B3263E' },
  CONTAINING: { title: 'Engaged', hint: 'Adventurers are fighting', sign: '#8A6A2A' },
  FIXED: { title: 'Slain', hint: 'Bounties paid out', sign: '#3F6B4E' },
}
/** Slain is history: keep the board short, the chronicle has the rest. */
const MAX_SLAIN = 4
const SEAL = ['#3F6B4E', '#2B5C8A', '#8A6A2A', '#9A4A1F', '#B3263E']

export function QuestBoard({
  glitches,
  guardians,
  me,
  selectedId,
  onChanged,
}: {
  glitches: GlitchListItem[]
  guardians: GuardianSummary[]
  me: SessionGuardian
  selectedId: string | null
  onChanged: () => Promise<void> | void
}) {
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<GlitchStatus | null>(null)
  const [pending, setPending] = useState<Record<string, GlitchStatus>>({})
  const [error, setError] = useState<string | null>(null)
  const canMove = can(me, PERMISSIONS.glitchUpdateStatus)
  const byId = new Map(guardians.map((g) => [g.guardianId, g]))

  // A dropped card shows in its new column right away, until the server confirms.
  const statusOf = (g: GlitchListItem) => pending[g.glitchId] ?? g.status

  async function move(glitchId: string, status: GlitchStatus) {
    const g = glitches.find((x) => x.glitchId === glitchId)
    if (!g || statusOf(g) === status) return
    setError(null)
    setPending((p) => ({ ...p, [glitchId]: status }))
    try {
      await updateGlitchStatus({ data: { glitchId, status } })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move the quest')
    } finally {
      setPending(({ [glitchId]: _done, ...rest }) => rest)
    }
  }

  function onDrop(e: DragEvent, status: GlitchStatus) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    setOver(null)
    setDragging(null)
    if (id) void move(id, status)
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </p>
      )}

      {/* The navy chart table */}
      <div className="quest-board overflow-x-auto rounded-md p-3 sm:p-4">
        {/* Wide enough for a whole poster per column; each column scrolls on its own, so the page keeps its height. */}
        <div className="grid min-w-[1260px] grid-cols-4 gap-3">
          {GLITCH_STATUSES.map((status, col) => {
            const column = COLUMNS[status]
            const all = glitches.filter((g) => statusOf(g) === status)
            const cards = status === 'FIXED' ? all.slice(0, MAX_SLAIN) : all
            const dropTarget = canMove && dragging !== null
            return (
              <section
                key={status}
                aria-label={`${column.title}: ${all.length} quests`}
                onDragOver={(e) => {
                  if (!dropTarget) return
                  e.preventDefault()
                  setOver(status)
                }}
                onDragLeave={() => setOver((o) => (o === status ? null : o))}
                onDrop={(e) => onDrop(e, status)}
                className={`relative flex h-[calc(100vh-15rem)] min-h-[480px] flex-col gap-4 rounded-md p-3 transition-colors ${
                  over === status ? 'bg-[#39C3D6]/15 ring-2 ring-[#E3C47A]' : 'bg-[#0A1328]/55 ring-1 ring-inset ring-[#C9A24B]/30'
                }`}
              >
                {/* Column plate */}
                <header className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-sm border border-[#C9A24B] px-3 py-1 font-display text-sm font-bold tracking-[0.15em] text-[#FAF7EF] uppercase shadow-[0_0_0_1px_#0A1328]"
                      style={{ background: column.sign }}
                    >
                      {column.title}
                    </span>
                    <span className="rounded-full border border-[#C9A24B]/60 bg-[#0A1328] px-2 py-0.5 text-xs font-bold text-[#E3C47A]">{all.length}</span>
                  </div>
                  {col < GLITCH_STATUSES.length - 1 && <ArrowRight className="size-4 text-[#C9A24B]" aria-hidden />}
                </header>
                <p className="-mt-2 text-xs font-medium text-[#E9E2CF]/75">{column.hint}</p>

                {/* Room at the top and right for the rank seal that sticks out of each poster. */}
                <div className="quest-column -mr-1.5 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pt-3 pr-3.5 pb-1">
                {cards.map((g) => (
                  <QuestCard
                    key={g.glitchId}
                    glitch={g}
                    status={statusOf(g)}
                    me={me}
                    byId={byId}
                    selected={g.glitchId === selectedId}
                    draggable={canMove}
                    dragging={dragging === g.glitchId}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', g.glitchId)
                      e.dataTransfer.effectAllowed = 'move'
                      setDragging(g.glitchId)
                    }}
                    onDragEnd={() => {
                      setDragging(null)
                      setOver(null)
                    }}
                    onAdvance={canMove && col < 3 ? () => move(g.glitchId, GLITCH_STATUSES[col + 1]) : undefined}
                    onChanged={onChanged}
                  />
                ))}
                {!all.length && (
                  <p className="rounded-md border border-dashed border-[#C9A24B]/40 p-4 text-center text-sm text-[#E9E2CF]/70">
                    {status === 'LEAKED' ? 'No new requests' : 'Nothing here'}
                  </p>
                )}
                {status === 'FIXED' && all.length > MAX_SLAIN && (
                  <Link to="/chronicle" className="text-center text-sm font-semibold text-[#E3C47A] underline-offset-2 hover:underline">
                    +{all.length - MAX_SLAIN} more in the Chronicle →
                  </Link>
                )}
                </div>
              </section>
            )
          })}
        </div>
      </div>
      {canMove && <p className="text-xs text-muted">Guild master: drag a poster to another column (or use “next step”) to move the quest along.</p>}
    </div>
  )
}

function QuestCard({
  glitch: g,
  status,
  me,
  byId,
  selected,
  draggable,
  dragging,
  onDragStart,
  onDragEnd,
  onAdvance,
  onChanged,
}: {
  glitch: GlitchListItem
  status: GlitchStatus
  me: SessionGuardian
  byId: Map<number, GuardianSummary>
  selected: boolean
  draggable: boolean
  dragging: boolean
  onDragStart: (e: DragEvent) => void
  onDragEnd: () => void
  onAdvance?: () => void
  onChanged: () => Promise<void> | void
}) {
  const slain = status === 'FIXED'
  const scouting = !g.monsterId
  // Rank and reward are known once the guild master has set them.
  const rank = g.rated ? questRank(g.locationDanger) : '?'

  return (
    <article
      data-glitch-id={g.glitchId}
      aria-selected={selected}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      
      className={`parchment relative flex flex-col gap-2 rounded-sm px-4 pt-5 pb-3 text-[#101D38] transition hover:-translate-y-0.5 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dragging ? 'opacity-50' : ''} ${selected ? 'outline-4 outline-offset-2 outline-[#E3C47A]' : ''} ${slain ? 'saturate-50' : ''}`}
    >
      {/* Gold rivet */}
      <span className="absolute top-2 left-2 size-2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#F3DC9A,#C9A24B_55%,#8A6A2A)] shadow-[0_0_0_1px_#101D38]" aria-hidden />

      {/* Seal with the rank, rimmed in gold */}
      <span
        className="absolute -top-3 -right-3 flex size-11 items-center justify-center rounded-full border-2 border-[#C9A24B] font-display text-lg font-bold text-[#FAF7EF] shadow-[0_0_0_1px_#101D38,inset_0_-3px_0_rgb(0_0_0/0.25),0_3px_6px_rgb(0_0_0/0.3)]"
        style={{ background: g.rated ? SEAL[g.locationDanger - 1] : '#4A5675' }}
        title={g.rated ? `Rank ${rank}` : 'Rank not set yet'}
      >
        {rank}
      </span>

      <div className="flex items-center justify-between gap-2 pr-6 text-[10px] font-bold tracking-[0.2em] text-[#4A5675] uppercase">
        <span>{scouting ? 'Rumour' : 'Wanted'} · {g.glitchId}</span>
      </div>

      <Link
        to="/glitches/$glitchId"
        params={{ glitchId: g.glitchId }}
        draggable={false}
        className="flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#4A5675]"
      >
        <span className="flex size-12 shrink-0 items-center justify-center rounded-sm border border-[#C9A24B] bg-[#101D38] shadow-inner">
          <MonsterIcon monsterId={g.monsterId} className="size-10" />
        </span>
        <span className="min-w-0">
          <span className="block font-display text-lg leading-tight font-bold">{g.monsterName}</span>
          <span className="block text-xs leading-snug text-[#2B3D62]">
            {g.locationName} · {g.regionName}
          </span>
        </span>
      </Link>

      <p className="line-clamp-2 text-sm italic">“{g.description}”</p>
      {scouting && <p className="text-xs font-semibold text-[#1E6F7C]">🏘️ {g.villagerReports} villager reports</p>}

      <div className="flex items-center justify-between gap-2 border-t border-dashed border-[#4A5675]/40 pt-2 text-xs">
        <span className="flex items-center gap-1 text-base font-black text-[#8A6A2A]">
          <Coins className="size-4" /> {g.rated ? g.reward : '?'}
          <span className="text-[10px] font-semibold text-[#4A5675]">gold</span>
        </span>
        <span className="flex items-center gap-1 text-[#2B3D62]" title={`${g.echoCount} sightings`}>
          <Eye className="size-3.5" /> {g.echoCount}
        </span>
        <span className="text-[#2B3D62]" suppressHydrationWarning>
          {formatTimestamp(g.timestamp).split(',')[0]}
        </span>
      </div>

      {/* Party */}
      <div className="flex min-h-7 items-center gap-1.5">
        {g.assignedGuardianIds.length ? (
          g.assignedGuardianIds.map((id) => {
            const member = byId.get(id)
            return (
              <span
                key={id}
                title={`${member?.codename ?? id} – ${member?.online ? 'online' : 'asleep (offline)'}`}
                className="relative flex size-7 items-center justify-center rounded-full border-2 border-[#4A5675] bg-[#E9E2CF] text-[10px] font-bold uppercase"
              >
                {(member?.codename ?? '?').slice(0, 2)}
                <span
                  className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border border-[#E9E2CF] ${member?.online ? 'bg-emerald-500' : 'bg-[#9AA3B8]'}`}
                />
              </span>
            )
          })
        ) : (
          <span className="text-xs text-[#4A5675] italic">{slain ? 'Slain by the guild' : 'No party yet'}</span>
        )}
      </div>

      {!slain && <QuestActions glitch={g} me={me} onChanged={onChanged} />}
      {onAdvance && !scouting && (
        <button
          type="button"
          onClick={onAdvance}
          className="inline-flex items-center justify-center gap-1 rounded-md border-2 border-[#101D38]/50 px-2 py-1 text-xs font-bold text-[#101D38] hover:bg-[#4A5675]/10"
        >
          Next step: {STATUS_LABELS[GLITCH_STATUSES[GLITCH_STATUSES.indexOf(status) + 1]]} <ArrowRight className="size-3.5" />
        </button>
      )}

      {slain && (
        <span className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12 rounded-md border-4 border-[#B3263E] px-3 py-0.5 text-2xl font-black tracking-widest text-[#B3263E] opacity-80 mix-blend-multiply">
          SLAIN
        </span>
      )}
    </article>
  )
}
