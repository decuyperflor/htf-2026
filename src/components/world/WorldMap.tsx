import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GlitchSprite } from '#/components/battlefield/GlitchSprite.tsx'
import { Soldier, staffTip } from '#/components/battlefield/Soldier.tsx'
import { DEATH_MS, SHOOT_MS, clamp01, sizeFor } from '#/components/battlefield/geometry.ts'
import type { GlitchSim, SoldierPos } from '#/components/battlefield/types.ts'
import { PERMISSIONS, can, type SessionGuardian } from '#/lib/auth.ts'
import { MagicGauge } from '#/components/MagicGauge.tsx'
import { questRank, type GlitchListItem, type Monster, type World } from '#/lib/glitch.ts'
import { magicLevel } from '#/lib/magic.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'
import { LocationPanel } from './LocationPanel.tsx'
import { QuestPanel } from './QuestPanel.tsx'
import { SpotPanel } from './SpotPanel.tsx'
import { MAP_H, MAP_W, REGION_ART, bounds } from './regions.ts'
import { RegionLabels, WorldArt, WorldFx } from './WorldArt.tsx'

/** Monsters and adventurers are drawn at this scale around their location. */
const SCENE_SCALE = 0.42
const RUN_SPEED = 160
/** Where the n-th monster at the same location stands (scene units). */
const SLOTS: [number, number][] = [[0, 0], [80, -40], [-80, -40], [80, 45], [-80, 45], [0, -85], [0, 85]]
/** Closest the camera can get (map units across). */
const MIN_VIEW_W = 90
const DANGER_COLORS = ['#8FB89A', '#8CC6D4', '#E3C47A', '#DA9A5A', '#E06A7C']

type Box = { x: number; y: number; w: number; h: number }
type MonsterSim = GlitchSim & { locationId: string; regionId: string; tx: number; ty: number; party: number[] }
type PartySim = { x: number; y: number; moving: boolean }

/** Grow a box to the container's aspect ratio, keeping its centre. */
function fit(box: Box, aspect: number): Box {
  let { w, h } = box
  if (w / h < aspect) w = h * aspect
  else h = w / aspect
  return { x: box.x + box.w / 2 - w / 2, y: box.y + box.h / 2 - h / 2, w, h }
}

/** Keep the centre of the view on the map. */
function clampBox(b: Box): Box {
  const cx = Math.min(MAP_W, Math.max(0, b.x + b.w / 2))
  const cy = Math.min(MAP_H, Math.max(0, b.y + b.h / 2))
  return { ...b, x: cx - b.w / 2, y: cy - b.h / 2 }
}

function regionBox(regionId: string): Box {
  const art = REGION_ART.find((r) => r.regionId === regionId)!
  const b = bounds(art.shape)
  const pad = 18
  return { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 }
}

const FULL: Box = { x: 0, y: 0, w: MAP_W, h: MAP_H }

export function WorldMap({
  glitches,
  guardians,
  world,
  monsters,
  me,
  onChanged,
  focusGlitchId,
  onFocused,
}: {
  glitches: GlitchListItem[]
  guardians: GuardianSummary[]
  world: World
  monsters: Monster[]
  me: SessionGuardian
  onChanged: () => Promise<void> | void
  /** Fly straight to this quest once it is on the map (e.g. from the lockdown alert). */
  focusGlitchId?: string
  onFocused?: () => void
}) {
  const [region, setRegion] = useState<string | null>(null)
  /** Area where the spot-a-monster card is open. */
  const [spotAt, setSpotAt] = useState<string | null>(null)
  /** A monster we just reported: open its quest once it is on the map. */
  const [justSpotted, setJustSpotted] = useState<string | null>(null)
  /** Scouting quest whose investigate form is open. */
  const [investigate, setInvestigate] = useState<string | null>(null)
  /** Which quest ranks (location danger 1–5) are shown. */
  const [ranks, setRanks] = useState<number[]>([1, 2, 3, 4, 5])
  const [selectedGlitch, setSelectedGlitch] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)

  const boxRef = useRef<HTMLDivElement>(null)
  const aspect = useRef(MAP_W / MAP_H)
  const target = useRef<Box>(FULL)
  const vb = useRef<Box>(FULL)
  const vbFrom = useRef<Box>(FULL)
  const vbAnim = useRef<{ start: number; to: Box } | null>(null)
  const drag = useRef<{ x: number; y: number; from: Box; moved: boolean; pointerId: number } | null>(null)
  const suppressClick = useRef(false)
  const sims = useRef(new Map<string, MonsterSim>())
  const party = useRef(new Map<string, PartySim>())
  const firstSync = useRef(true)

  const locationById = new Map(world.locations.map((l) => [l.locationId, l]))

  /** Fly the camera to a box (fitted to the container). */
  function flyTo(box: Box) {
    target.current = box
    vbFrom.current = vb.current
    vbAnim.current = { start: performance.now(), to: fit(box, aspect.current) }
  }

  // Container aspect ratio, so the map always fills the box.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const { width, height } = box.getBoundingClientRect()
      if (!width || !height) return
      aspect.current = width / height
      vb.current = fit(vb.current, aspect.current)
      flyTo(target.current)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  // Mouse wheel / trackpad: zoom around the cursor.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = box.getBoundingClientRect()
      const v = vb.current
      const w = Math.min(MAP_W * 1.1, Math.max(MIN_VIEW_W, v.w * Math.exp(e.deltaY * 0.0015)))
      const h = w / aspect.current
      const fx = (e.clientX - rect.left) / rect.width
      const fy = (e.clientY - rect.top) / rect.height
      vbAnim.current = null
      vb.current = clampBox({ x: v.x + fx * v.w - fx * w, y: v.y + fy * v.h - fy * h, w, h })
      target.current = vb.current
    }
    box.addEventListener('wheel', onWheel, { passive: false })
    return () => box.removeEventListener('wheel', onWheel)
  }, [])

  // Reconcile server data with what is on screen; status *changes* drive the animations.
  useEffect(() => {
    const t = performance.now()
    const atLocation = new Map<string, string[]>()
    for (const g of glitches) {
      if (g.status === 'FIXED' && !sims.current.has(g.glitchId)) continue
      atLocation.set(g.locationId, [...(atLocation.get(g.locationId) ?? []), g.glitchId])
    }
    const slotOf = (g: GlitchListItem) => {
      const ids = (atLocation.get(g.locationId) ?? []).sort()
      return SLOTS[Math.max(0, ids.indexOf(g.glitchId)) % SLOTS.length]
    }

    const seen = new Set<string>()
    for (const g of glitches) {
      seen.add(g.glitchId)
      // Scouting quests have no monster yet: they show as a question mark (see below).
      if (!g.monsterId) continue
      const sim = sims.current.get(g.glitchId)
      const [tx, ty] = slotOf(g)
      const size = sizeFor(g.echoCount, g.danger)
      if (!sim) {
        if (g.status === 'FIXED') continue
        sims.current.set(g.glitchId, {
          id: g.glitchId,
          description: g.description,
          monsterId: g.monsterId,
          monsterName: g.monsterName,
          echoCount: g.echoCount,
          status: g.status,
          statusSince: t - 10_000,
          bornAt: firstSync.current ? t - 10_000 : t,
          dyingSince: null,
          x: tx,
          y: ty,
          tx,
          ty,
          size,
          targetSize: size,
          locationId: g.locationId,
          regionId: g.regionId,
          party: g.assignedGuardianIds,
        })
        continue
      }
      Object.assign(sim, {
        description: g.description,
        monsterId: g.monsterId,
        monsterName: g.monsterName,
        echoCount: g.echoCount,
        targetSize: size,
        tx,
        ty,
        locationId: g.locationId,
        regionId: g.regionId,
        party: g.assignedGuardianIds,
      })
      if (sim.status !== g.status) {
        sim.status = g.status
        sim.statusSince = t
        sim.dyingSince = g.status === 'FIXED' ? (sim.dyingSince ?? t) : null
      }
    }
    for (const sim of sims.current.values()) {
      if (!seen.has(sim.id) && sim.dyingSince === null) sim.dyingSince = t
    }
    firstSync.current = false
  }, [glitches])

  // Animation loop.
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t

      const anim = vbAnim.current
      if (anim) {
        const k = clamp01((t - anim.start) / 750)
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2
        const a = vbFrom.current
        vb.current = {
          x: a.x + (anim.to.x - a.x) * e,
          y: a.y + (anim.to.y - a.y) * e,
          w: a.w + (anim.to.w - a.w) * e,
          h: a.h + (anim.to.h - a.h) * e,
        }
        if (k >= 1) vbAnim.current = null
      }

      const alive = new Set<string>()
      for (const sim of sims.current.values()) {
        sim.size += (sim.targetSize - sim.size) * Math.min(1, dt * 3)
        sim.x += (sim.tx - sim.x) * Math.min(1, dt * 4)
        sim.y += (sim.ty - sim.y) * Math.min(1, dt * 4)
        if (sim.dyingSince !== null && t - sim.dyingSince > DEATH_MS) {
          sims.current.delete(sim.id)
          continue
        }
        // Adventurers on the quest run in and stand to the left of their monster.
        sim.party.forEach((guardianId, i) => {
          const key = `${sim.id}:${guardianId}`
          alive.add(key)
          const goal = {
            x: sim.x - (sim.size * 2.2 + 34),
            y: sim.y + (i - (sim.party.length - 1) / 2) * 44,
          }
          const p = party.current.get(key) ?? { x: goal.x - 140, y: goal.y, moving: true }
          const dx = goal.x - p.x
          const dy = goal.y - p.y
          const d = Math.hypot(dx, dy)
          p.moving = d > 1
          if (p.moving) {
            const s = Math.min(d, RUN_SPEED * dt)
            p.x += (dx / d) * s
            p.y += (dy / d) * s
          }
          party.current.set(key, p)
        })
      }
      for (const key of party.current.keys()) if (!alive.has(key)) party.current.delete(key)

      setNow(t)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Escape: close the panel, then zoom back out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (selectedGlitch || selectedLocation) {
        setSelectedGlitch(null)
        setSelectedLocation(null)
      } else zoomTo(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // ---------- Drag to pan ----------

  function onPointerDown(e: ReactPointerEvent) {
    if (e.button !== 0 || (e.target as Element).closest('[data-panel]')) return
    drag.current = { x: e.clientX, y: e.clientY, from: vb.current, moved: false, pointerId: e.pointerId }
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current
    const box = boxRef.current
    if (!d || !box || e.pointerId !== d.pointerId) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved) {
      if (Math.hypot(dx, dy) < 5) return
      d.moved = true
      box.setPointerCapture(e.pointerId)
    }
    const scale = d.from.w / box.getBoundingClientRect().width
    vbAnim.current = null
    vb.current = clampBox({ ...d.from, x: d.from.x - dx * scale, y: d.from.y - dy * scale })
    target.current = vb.current
  }

  function onPointerUp(e: ReactPointerEvent) {
    const d = drag.current
    if (!d || e.pointerId !== d.pointerId) return
    if (d.moved) {
      // The click that follows a drag must not open anything.
      suppressClick.current = true
      setTimeout(() => (suppressClick.current = false), 0)
    }
    drag.current = null
  }

  function zoomBy(factor: number) {
    const v = vb.current
    const w = Math.min(MAP_W * 1.1, Math.max(MIN_VIEW_W, v.w * factor))
    flyTo(clampBox({ x: v.x + v.w / 2 - w / 2, y: v.y + v.h / 2 - (w / aspect.current) / 2, w, h: w / aspect.current }))
  }

  // ---------- Derived view state ----------

  const view = vb.current
  const zoom = clamp01((MAP_W / view.w - 1) / 0.8)
  const zoomedIn = zoom > 0.6
  const guardianById = new Map(guardians.map((g) => [g.guardianId, g]))
  const glitchById = new Map(glitches.map((g) => [g.glitchId, g]))
  const shownRank = (glitchId: string) => ranks.includes(glitchById.get(glitchId)?.locationDanger ?? 1)
  const all = [...sims.current.values()].filter((s) => shownRank(s.id))
  const active = glitches.filter((g) => g.status !== 'FIXED' && shownRank(g.glitchId))
  /** Scouting quests: villagers report trouble, nobody knows the monster yet. */
  const scouting = active.filter((g) => !g.monsterId)
  const counts: Record<string, number> = {}
  for (const g of active) counts[g.regionId] = (counts[g.regionId] ?? 0) + 1
  const names = Object.fromEntries(world.regions.map((r) => [r.regionId, r.name]))
  const selected = glitches.find((g) => g.glitchId === selectedGlitch) ?? null
  const selectedLoc = selectedLocation ? (locationById.get(selectedLocation) ?? null) : null
  const spotLoc = spotAt ? (locationById.get(spotAt) ?? null) : null
  const investigating = investigate ? (glitches.find((g) => g.glitchId === investigate && !g.monsterId) ?? null) : null
  const manage = can(me, PERMISSIONS.locationManage)
  const spot = can(me, PERMISSIONS.echoCreate)
  const clickArea = manage || spot
  /** The open quest at each area: only those areas show a rank and a reward. */
  const questAt = new Map(glitches.filter((g) => g.status !== 'FIXED').map((g) => [g.locationId, g]))

  /** An area with an open quest opens that quest; otherwise guild master: area settings, adventurers: spot a monster. */
  function openArea(locationId: string) {
    const quest = questAt.get(locationId)
    if (quest) {
      const sim = sims.current.get(quest.glitchId)
      if (sim) openQuest(sim)
      else openScouting(quest)
      return
    }
    if (manage) {
      setSpotAt(null)
      setSelectedGlitch(null)
      setSelectedLocation(locationId)
    } else {
      setSelectedGlitch(null)
      setSpotAt(locationId)
    }
  }

  /** Zoom right onto a monster and its party, leaving room for the quest card on the right. */
  function openQuest(sim: MonsterSim) {
    const loc = locationById.get(sim.locationId)
    if (!loc) return
    const mx = loc.x + sim.x * SCENE_SCALE
    const my = loc.y + sim.y * SCENE_SCALE
    const partyW = sim.party.length ? (sim.size * 2.2 + 60) * SCENE_SCALE : 0
    const w = 130 + partyW
    const b = fit({ x: mx - partyW - 50, y: my - 45, w, h: 90 }, aspect.current)
    b.x += b.w * 0.17
    setSelectedLocation(null)
    setSpotAt(null)
    setSelectedGlitch(sim.id)
    setRegion(sim.regionId)
    flyTo(b)
  }

  /** Zoom onto a scouting quest's area (no monster to frame yet). */
  function openScouting(g: GlitchListItem) {
    const loc = locationById.get(g.locationId)
    if (!loc) return
    const b = fit({ x: loc.x - 70, y: loc.y - 45, w: 140, h: 90 }, aspect.current)
    b.x += b.w * 0.17
    setSelectedLocation(null)
    setSpotAt(null)
    setInvestigate(null)
    setSelectedGlitch(g.glitchId)
    setRegion(g.regionId)
    flyTo(b)
  }

  function zoomTo(regionId: string | null) {
    setSelectedGlitch(null)
    setSelectedLocation(null)
    setSpotAt(null)
    setRegion(regionId)
    flyTo(regionId ? regionBox(regionId) : FULL)
  }

  // Coming from elsewhere (lockdown alert): open that quest as soon as its monster is on the map.
  const focused = useRef<string | null>(null)
  useEffect(() => {
    const id = focusGlitchId ?? justSpotted
    if (!id || focused.current === id) return
    const glitch = glitchById.get(id)
    const sim = sims.current.get(id)
    if (!sim && !(glitch && !glitch.monsterId)) return
    focused.current = id
    if (id === justSpotted) setJustSpotted(null)
    if (glitch && !ranks.includes(glitch.locationDanger)) setRanks((r) => [...r, glitch.locationDanger])
    if (sim) openQuest(sim)
    else openScouting(glitch!)
    onFocused?.()
  })

  const awayFromOverview = region !== null || zoom > 0.08

  return (
    <div
      ref={boxRef}
      className="relative h-full w-full touch-none overflow-hidden rounded-md bg-[#101D38] ring-1 ring-[#C9A24B]"
      style={{ cursor: drag.current?.moved ? 'grabbing' : 'grab' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.stopPropagation()
          e.preventDefault()
        }
      }}
    >
      {now !== null && (
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 size-full select-none"
          role="img"
          aria-label="World map of Achrona with its regions and the monsters in them"
        >
          <defs>
            <radialGradient id="bf-blast">
              <stop offset="0" stopColor="#FAF7EF" />
              <stop offset="0.4" stopColor="#E3C47A" />
              <stop offset="1" stopColor="#B3263E" stopOpacity="0" />
            </radialGradient>
          </defs>

          <WorldArt locations={world.locations} />
          <WorldFx now={now} cloudOpacity={1 - zoom} />

          {/* Clickable regions (overview) */}
          {!zoomedIn &&
            REGION_ART.map((r) => (
              <path
                key={r.regionId}
                d={`M ${r.shape.map((p) => p.join(' ')).join(' L ')} Z`}
                fill="#fff"
                fillOpacity={0}
                className="cursor-pointer transition-[fill-opacity] hover:fill-opacity-20"
                role="button"
                tabIndex={0}
                aria-label={`Zoom into ${names[r.regionId] ?? r.regionId}`}
                onClick={() => zoomTo(r.regionId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    zoomTo(r.regionId)
                  }
                }}
              />
            ))}

          {/* Areas where monsters can be spotted */}
          {world.locations.map((l) => (
            <g
              key={l.locationId}
              transform={`translate(${l.x} ${l.y + 4})`}
              pointerEvents={clickArea ? 'auto' : 'none'}
              className={clickArea ? 'cursor-pointer' : undefined}
              onClick={clickArea ? () => openArea(l.locationId) : undefined}
            >
              <ellipse rx={24} ry={12} fill="#FAF7EF" fillOpacity={0.28} stroke="#101D38" strokeOpacity={0.45} strokeWidth={0.8} strokeDasharray="3 2" />
              {questAt.get(l.locationId)?.rated && (
                <circle r={1.8} cy={-4} fill={DANGER_COLORS[questAt.get(l.locationId)!.locationDanger - 1]} stroke="#101D38" strokeWidth={0.5} />
              )}
            </g>
          ))}

          {/* Area labels. Rank and reward only where a monster is at large; an empty
              area is just its name. Click: spot a monster there (guild master: settings). */}
          {zoom > 0.35 &&
            world.locations.map((l) => {
              const q = questAt.get(l.locationId)
              const quest = q && q.rated ? q : null
              const unknown = q && !q.rated
              const w = quest ? l.name.length * 3.1 + 34 : l.name.length * 3.1 + (unknown ? 22 : 12)
              return (
                <g
                  key={l.locationId}
                  transform={`translate(${l.x} ${l.y + 22})`}
                  opacity={clamp01((zoom - 0.35) / 0.3)}
                  className={clickArea ? 'cursor-pointer' : undefined}
                  role={clickArea ? 'button' : undefined}
                  tabIndex={clickArea ? 0 : undefined}
                  aria-label={manage ? `Set danger and reward for ${l.name}` : clickArea ? `Spot a monster at ${l.name}` : undefined}
                  onClick={clickArea ? () => openArea(l.locationId) : undefined}
                  onKeyDown={clickArea ? (e) => e.key === 'Enter' && openArea(l.locationId) : undefined}
                  pointerEvents={clickArea ? 'auto' : 'none'}
                >
                  <rect x={-w / 2} y={-5.5} width={w} height={11} rx={1.5} fill="#FAF7EF" stroke="#101D38" strokeWidth={0.7} />
                  {quest ? (
                    <>
                      <circle cx={-w / 2 + 6} cy={0} r={4.2} fill={DANGER_COLORS[quest.locationDanger - 1]} stroke="#101D38" strokeWidth={0.6} />
                      <text x={-w / 2 + 6} y={1.9} textAnchor="middle" fontSize={5} fontWeight={800} fill="#101D38">
                        {questRank(quest.locationDanger)}
                      </text>
                      <text x={-w / 2 + 12} y={1.9} fontSize={5} fontWeight={600} fill="#101D38">
                        {l.name}
                      </text>
                      <text x={w / 2 - 3} y={1.9} textAnchor="end" fontSize={4.6} fontWeight={700} fill="#8A6A2A">
                        {quest.reward}g
                      </text>
                    </>
                  ) : unknown ? (
                    <>
                      <circle cx={-w / 2 + 6} cy={0} r={4.2} fill="#39C3D6" stroke="#101D38" strokeWidth={0.6} />
                      <text x={-w / 2 + 6} y={1.9} textAnchor="middle" fontSize={5} fontWeight={800} fill="#101D38">
                        ?
                      </text>
                      <text x={-w / 2 + 12} y={1.9} fontSize={5} fontWeight={600} fill="#101D38">
                        {l.name}
                      </text>
                    </>
                  ) : (
                    <text x={0} y={1.9} textAnchor="middle" fontSize={5} fontWeight={600} fill="#101D38">
                      {l.name}
                    </text>
                  )}
                </g>
              )
            })}

          {/* Monsters + their party, drawn around their location */}
          {world.locations.map((l) => {
            const here = all.filter((s) => s.locationId === l.locationId)
            if (!here.length) return null
            return (
              <g key={l.locationId} transform={`translate(${l.x} ${l.y}) scale(${SCENE_SCALE})`}>
                {here.map((sim) => {
                  const members = sim.party.flatMap((id) => {
                    const p = party.current.get(`${sim.id}:${id}`)
                    const g = guardianById.get(id)
                    return p && g ? [{ ...g, x: p.x, y: p.y, moving: p.moving } satisfies SoldierPos] : []
                  })
                  const dying = sim.dyingSince !== null
                  const finalBlow = dying && now - sim.dyingSince! < SHOOT_MS
                  return (
                    <g key={sim.id}>
                      {selectedGlitch === sim.id && (
                        <circle cx={sim.x} cy={sim.y} r={sim.size * 1.9} fill="none" stroke="#E3C47A" strokeWidth={5} strokeDasharray="10 8" transform={`rotate(${(now / 15) % 360} ${sim.x} ${sim.y})`} />
                      )}
                      {members.map((m, i) => {
                        // Online adventurers fight; the ones who are logged out sleep on the spot.
                        const asleep = !m.online && !m.moving && !dying
                        const fighting = m.online && !m.moving && !dying
                        return (
                          <g key={m.guardianId}>
                            {fighting && <MagicBolts from={m} to={sim} now={now} seed={i} />}
                            <Soldier soldier={m} now={now} aim={sim} shooting={fighting || finalBlow} sleeping={asleep} />
                          </g>
                        )
                      })}
                      <GlitchSprite
                        sim={sim}
                        now={now}
                        attackers={dying ? members.map((m) => ({ soldier: m, aim: sim })) : []}
                        onOpen={() => openQuest(sim)}
                      />
                      {/* Stable, generous hit area: the sprite itself is redrawn every frame. */}
                      {!dying && (
                        <circle
                          cx={sim.x}
                          cy={sim.y}
                          r={Math.max(sim.size * 1.7, 38)}
                          fill="#fff"
                          fillOpacity={0}
                          className="cursor-pointer"
                          onClick={() => openQuest(sim)}
                        />
                      )}
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Scouting quests: a question mark over the area, villagers' reports piling up */}
          {scouting.map((g) => {
            const l = locationById.get(g.locationId)
            if (!l) return null
            const bob = Math.sin((now ?? 0) / 400 + l.x) * 2
            const on = selectedGlitch === g.glitchId
            return (
              <g
                key={g.glitchId}
                transform={`translate(${l.x} ${l.y - 6 + bob})`}
                className="cursor-pointer"
                role="button"
                aria-label={`Scouting quest at ${l.name}: ${g.villagerReports} villager reports`}
                onClick={() => openScouting(g)}
              >
                <circle r={on ? 13 : 11} fill="#39C3D6" opacity={0.25} />
                <circle r={9} fill="#101D38" stroke={on ? '#ffcf4d' : '#C9A24B'} strokeWidth={on ? 2 : 1.4} />
                <text y={4.6} textAnchor="middle" fontSize={13} fontWeight={900} fontFamily="Cinzel, Georgia, serif" fill="#E9E2CF">
                  ?
                </text>
                <g transform="translate(8 -8)">
                  <circle r={4.4} fill="#B3263E" stroke="#FAF7EF" strokeWidth={0.8} />
                  <text y={1.8} textAnchor="middle" fontSize={5} fontWeight={800} fill="#fff">
                    {g.villagerReports}
                  </text>
                </g>
              </g>
            )
          })}

          <RegionLabels names={names} counts={counts} opacity={1 - zoom} />
        </svg>
      )}

      {/* Night falls over Achrona in dark mode */}
      <div className="pointer-events-none absolute inset-0 hidden bg-[#0A1328]/45 mix-blend-multiply dark:block" aria-hidden />

      {/* HUD */}
      <div className="pointer-events-none absolute top-4 left-4 flex flex-wrap items-center gap-2" data-panel>
        {awayFromOverview && (
          <button
            type="button"
            onClick={() => zoomTo(null)}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-sm border border-[#C9A24B] bg-[#101D38] shadow-[0_0_0_1px_#0A1328,0_4px_10px_rgb(0_0_0/0.35)] px-3 py-1 text-sm font-semibold text-[#E9E2CF] hover:text-[#E3C47A]"
          >
            <ArrowLeft className="size-4" /> World map
          </button>
        )}
        <span className="rounded-sm border border-[#C9A24B] bg-[#101D38] shadow-[0_0_0_1px_#0A1328,0_4px_10px_rgb(0_0_0/0.35)] px-3 py-1 font-display text-sm font-bold tracking-wider text-[#E9E2CF]">
          {region ? names[region] : 'World of Achrona'}
        </span>
        <span className="rounded-sm border border-[#C9A24B] bg-[#B3263E] px-2.5 py-1 text-xs font-bold text-[#FAF7EF] shadow-[0_0_0_1px_#0A1328,0_4px_10px_rgb(0_0_0/0.35)]">
          {region ? (counts[region] ?? 0) : active.length} monsters at large
        </span>
        <div
          role="group"
          aria-label="Filter by quest rank"
          className="pointer-events-auto flex items-center gap-1 rounded-sm border border-[#C9A24B] bg-[#101D38] shadow-[0_0_0_1px_#0A1328,0_4px_10px_rgb(0_0_0/0.35)] px-1.5 py-0.5"
        >
          <span className="px-1 font-display text-xs font-semibold text-[#E9E2CF]/75">Rank</span>
          {[1, 2, 3, 4, 5].map((d) => {
            const on = ranks.includes(d)
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                title={on ? `Hide rank ${questRank(d)} quests` : `Show rank ${questRank(d)} quests`}
                onClick={() => setRanks((r) => (on ? r.filter((x) => x !== d) : [...r, d]))}
                className={`size-6 rounded-full font-display text-xs font-bold transition ${on ? 'text-[#101D38] ring-1 ring-[#0A1328]' : 'bg-transparent text-[#E9E2CF]/40 line-through'}`}
                style={on ? { backgroundColor: DANGER_COLORS[d - 1] } : undefined}
              >
                {questRank(d)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="absolute top-4 right-4 flex flex-col overflow-hidden rounded-sm border border-[#C9A24B] bg-[#101D38] shadow-[0_0_0_1px_#0A1328,0_4px_10px_rgb(0_0_0/0.35)]" data-panel>
        <button type="button" onClick={() => zoomBy(0.7)} aria-label="Zoom in" className="p-2 text-[#E9E2CF] hover:bg-white/10 hover:text-[#E3C47A]">
          <Plus className="size-4" />
        </button>
        <button type="button" onClick={() => zoomBy(1 / 0.7)} aria-label="Zoom out" className="border-t border-[#C9A24B]/60 p-2 text-[#E9E2CF] hover:bg-white/10 hover:text-[#E3C47A]">
          <Minus className="size-4" />
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 flex flex-col items-start gap-2" data-panel>
        {/* All monsters count, whatever the rank filter shows. */}
        <MagicGauge level={magicLevel(glitches)} />
        {!selected && !selectedLoc && !spotAt && (
          <p className="rounded-sm border border-[#C9A24B]/60 bg-[#101D38]/90 px-3 py-1 text-xs font-medium text-[#E9E2CF]">
            Drag to move · scroll to zoom · click a region or monster
            {manage ? ' · click an area to set danger & reward' : spot ? ' · click an area to spot a monster there' : ''}
          </p>
        )}
      </div>

      {selected && (
        <div data-panel>
          <QuestPanel
            glitch={selected}
            me={me}
            guardians={guardians}
            onClose={() => setSelectedGlitch(null)}
            onChanged={onChanged}
            onInvestigate={() => {
              setInvestigate(selected.glitchId)
              setSelectedGlitch(null)
            }}
          />
        </div>
      )}
      {selectedLoc && (
        <div data-panel>
          <LocationPanel
            key={selectedLoc.locationId}
            location={selectedLoc}
            onClose={() => setSelectedLocation(null)}
            onChanged={onChanged}
            onSpot={spot ? () => {
              setSelectedLocation(null)
              setSpotAt(selectedLoc.locationId)
            } : undefined}
          />
        </div>
      )}
      {investigating && (
        <div data-panel>
          <SpotPanel
            key={investigating.glitchId}
            location={locationById.get(investigating.locationId)!}
            regionName={investigating.regionName}
            monsters={monsters}
            investigate={investigating}
            onClose={() => setInvestigate(null)}
            onSpotted={async (glitchId) => {
              await onChanged()
              setInvestigate(null)
              focused.current = null
              setJustSpotted(glitchId)
            }}
          />
        </div>
      )}
      {spotLoc && (
        <div data-panel>
          <SpotPanel
            key={spotLoc.locationId}
            location={spotLoc}
            regionName={names[spotLoc.regionId] ?? ''}
            monsters={monsters}
            onClose={() => setSpotAt(null)}
            onSpotted={async (glitchId) => {
              await onChanged()
              setSpotAt(null)
              focused.current = null
              setJustSpotted(glitchId)
            }}
          />
        </div>
      )}
    </div>
  )
}

/** Magic missiles flying from an adventurer's staff to the monster. */
function MagicBolts({ from, to, now, seed }: { from: SoldierPos; to: { x: number; y: number }; now: number; seed: number }) {
  const { tx, ty } = staffTip(from, to, now)
  return (
    <g pointerEvents="none">
      {[0, 1].map((k) => {
        const p = (now / 650 + seed * 0.31 + k / 2) % 1
        const back = 0.12
        return (
          <line
            key={k}
            x1={tx + (to.x - tx) * Math.max(0, p - back)}
            y1={ty + (to.y - ty) * Math.max(0, p - back)}
            x2={tx + (to.x - tx) * p}
            y2={ty + (to.y - ty) * p}
            stroke="#39C3D6"
            strokeWidth={4}
            strokeLinecap="round"
            opacity={0.9}
          />
        )
      })}
    </g>
  )
}
