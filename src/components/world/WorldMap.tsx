import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { GlitchSprite } from '#/components/battlefield/GlitchSprite.tsx'
import { Soldier } from '#/components/battlefield/Soldier.tsx'
import { DEATH_MS, SHOOT_MS, clamp01, sizeFor } from '#/components/battlefield/geometry.ts'
import type { GlitchSim, SoldierPos } from '#/components/battlefield/types.ts'
import { PERMISSIONS, can, type SessionGuardian } from '#/lib/auth.ts'
import { questRank, type GlitchListItem, type World } from '#/lib/glitch.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'
import { LocationPanel } from './LocationPanel.tsx'
import { QuestPanel } from './QuestPanel.tsx'
import { MAP_H, MAP_W, REGION_ART, bounds } from './regions.ts'
import { RegionLabels, WorldArt, WorldFx } from './WorldArt.tsx'

/** Monsters and adventurers are drawn at this scale around their location. */
const SCENE_SCALE = 0.42
const RUN_SPEED = 160
/** Where the n-th monster at the same location stands (scene units). */
const SLOTS: [number, number][] = [[0, 0], [80, -40], [-80, -40], [80, 45], [-80, 45], [0, -85], [0, 85]]

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
  me,
  onChanged,
}: {
  glitches: GlitchListItem[]
  guardians: GuardianSummary[]
  world: World
  me: SessionGuardian
  onChanged: () => Promise<void> | void
}) {
  const [region, setRegion] = useState<string | null>(null)
  const [selectedGlitch, setSelectedGlitch] = useState<string | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [aspect, setAspect] = useState(MAP_W / MAP_H)

  const boxRef = useRef<HTMLDivElement>(null)
  const vb = useRef<Box>(FULL)
  const vbFrom = useRef<Box>(FULL)
  const vbAnim = useRef<{ start: number; to: Box } | null>(null)
  const sims = useRef(new Map<string, MonsterSim>())
  const party = useRef(new Map<string, PartySim>())
  const firstSync = useRef(true)

  const locationById = new Map(world.locations.map((l) => [l.locationId, l]))

  // Container aspect ratio, so zooming fills the box.
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const { width, height } = box.getBoundingClientRect()
      if (width && height) setAspect(width / height)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  // Animate the camera whenever the region or the box shape changes.
  useEffect(() => {
    const to = fit(region ? regionBox(region) : FULL, aspect)
    vbFrom.current = vb.current
    vbAnim.current = { start: performance.now(), to }
  }, [region, aspect])

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
        const k = clamp01((t - anim.start) / 700)
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
          const target = {
            x: sim.x - (sim.size * 2.2 + 34),
            y: sim.y + (i - (sim.party.length - 1) / 2) * 40,
          }
          const p = party.current.get(key) ?? { x: target.x - 140, y: target.y, moving: true }
          const dx = target.x - p.x
          const dy = target.y - p.y
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

  // Escape zooms back out.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (selectedGlitch || selectedLocation) {
        setSelectedGlitch(null)
        setSelectedLocation(null)
      } else setRegion(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedGlitch, selectedLocation])

  const view = vb.current
  const zoom = clamp01((MAP_W / view.w - 1) / 0.8)
  const zoomedIn = region !== null && zoom > 0.6
  const guardianById = new Map(guardians.map((g) => [g.guardianId, g]))
  const all = [...sims.current.values()]
  const active = glitches.filter((g) => g.status !== 'FIXED')
  const counts: Record<string, number> = {}
  for (const g of active) counts[g.regionId] = (counts[g.regionId] ?? 0) + 1
  const names = Object.fromEntries(world.regions.map((r) => [r.regionId, r.name]))
  const selected = glitches.find((g) => g.glitchId === selectedGlitch) ?? null
  const selectedLoc = selectedLocation ? (locationById.get(selectedLocation) ?? null) : null

  function zoomTo(regionId: string | null) {
    setSelectedGlitch(null)
    setSelectedLocation(null)
    setRegion(regionId)
  }

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden rounded-3xl bg-[#7cc8e8]">
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
              <stop offset="0" stopColor="#fff7c2" />
              <stop offset="0.4" stopColor="#ffb547" />
              <stop offset="1" stopColor="#ff2d75" stopOpacity="0" />
            </radialGradient>
          </defs>

          <WorldArt locations={world.locations} />
          <WorldFx now={now} cloudOpacity={1 - zoom} />

          {/* Clickable regions (overview only) */}
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

          {/* Location markers (zoomed in) */}
          {zoomedIn &&
            world.locations
              .filter((l) => l.regionId === region)
              .map((l) => {
                const manage = can(me, PERMISSIONS.locationManage)
                const label = `${l.name}`
                const w = label.length * 3.1 + 34
                return (
                  <g
                    key={l.locationId}
                    transform={`translate(${l.x} ${l.y + 30})`}
                    opacity={zoom}
                    className={manage ? 'cursor-pointer' : undefined}
                    role={manage ? 'button' : undefined}
                    tabIndex={manage ? 0 : undefined}
                    aria-label={manage ? `Set danger and reward for ${l.name}` : undefined}
                    onClick={
                      manage
                        ? () => {
                            setSelectedGlitch(null)
                            setSelectedLocation(l.locationId)
                          }
                        : undefined
                    }
                  >
                    <rect x={-w / 2} y={-5.5} width={w} height={11} rx={5.5} fill="#fffaf0" stroke="#2b2340" strokeWidth={0.8} />
                    <circle cx={-w / 2 + 6} cy={0} r={4.2} fill={['#7fd18a', '#9fd4ff', '#ffd36b', '#ff9a5c', '#ff4d6d'][l.danger - 1]} stroke="#2b2340" strokeWidth={0.6} />
                    <text x={-w / 2 + 6} y={1.9} textAnchor="middle" fontSize={5} fontWeight={800} fill="#2b2340">
                      {questRank(l.danger)}
                    </text>
                    <text x={-w / 2 + 12} y={1.9} fontSize={5} fontWeight={600} fill="#2b2340">
                      {label}
                    </text>
                    <text x={w / 2 - 3} y={1.9} textAnchor="end" fontSize={4.6} fontWeight={700} fill="#b8862f">
                      {l.reward}g
                    </text>
                  </g>
                )
              })}

          {/* Monsters + adventurers, drawn around their location */}
          {world.locations.map((l) => {
            const here = all.filter((s) => s.locationId === l.locationId)
            if (!here.length) return null
            return (
              <g
                key={l.locationId}
                transform={`translate(${l.x} ${l.y}) scale(${SCENE_SCALE})`}
                pointerEvents={zoomedIn && l.regionId === region ? 'auto' : 'none'}
              >
                {here.map((sim) => {
                  const fighters: SoldierPos[] = sim.party.flatMap((id) => {
                    const p = party.current.get(`${sim.id}:${id}`)
                    const g = guardianById.get(id)
                    return p && g ? [{ ...g, x: p.x, y: p.y, moving: p.moving }] : []
                  })
                  const attacking = sim.dyingSince !== null && now - sim.dyingSince < SHOOT_MS
                  return (
                    <g key={sim.id}>
                      {selectedGlitch === sim.id && (
                        <circle cx={sim.x} cy={sim.y} r={sim.size * 1.9} fill="none" stroke="#ffcf4d" strokeWidth={5} strokeDasharray="10 8" transform={`rotate(${(now / 15) % 360} ${sim.x} ${sim.y})`} />
                      )}
                      {fighters.map((f) => (
                        <Soldier key={f.guardianId} soldier={f} now={now} aim={sim} shooting={attacking} />
                      ))}
                      <GlitchSprite
                        sim={sim}
                        now={now}
                        attackers={sim.dyingSince !== null ? fighters.map((f) => ({ soldier: f, aim: sim })) : []}
                        onOpen={() => {
                          setSelectedLocation(null)
                          setSelectedGlitch(sim.id)
                        }}
                      />
                    </g>
                  )
                })}
              </g>
            )
          })}

          <RegionLabels names={names} counts={counts} opacity={1 - zoom} />
        </svg>
      )}

      {/* HUD */}
      <div className="pointer-events-none absolute top-4 left-4 flex items-center gap-2">
        {region ? (
          <button
            type="button"
            onClick={() => zoomTo(null)}
            className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border-2 border-[#2b2340] bg-[#fffaf0] px-3 py-1 text-sm font-semibold text-[#2b2340] shadow-md hover:bg-white"
          >
            <ArrowLeft className="size-4" /> World map
          </button>
        ) : null}
        <span className="rounded-full border-2 border-[#2b2340] bg-[#fffaf0] px-3 py-1 text-sm font-bold text-[#2b2340] shadow-md">
          {region ? names[region] : 'World of Achrona'}
        </span>
        <span className="rounded-full bg-[#ff3b5c] px-2.5 py-1 text-xs font-bold text-white shadow-md">
          {region ? (counts[region] ?? 0) : active.length} monsters at large
        </span>
      </div>
      {!region && (
        <p className="pointer-events-none absolute bottom-3 left-4 rounded-full bg-[#fffaf0]/90 px-3 py-1 text-xs font-medium text-[#2b2340]">
          Click a region to see its quests
        </p>
      )}
      {region && !selected && !selectedLoc && (
        <p className="pointer-events-none absolute bottom-3 left-4 rounded-full bg-[#fffaf0]/90 px-3 py-1 text-xs font-medium text-[#2b2340]">
          Click a monster to see the quest{can(me, PERMISSIONS.locationManage) ? ' · click a location to set danger & reward' : ''}
        </p>
      )}

      {selected && (
        <QuestPanel glitch={selected} me={me} guardians={guardians} onClose={() => setSelectedGlitch(null)} onChanged={onChanged} />
      )}
      {selectedLoc && (
        <LocationPanel location={selectedLoc} onClose={() => setSelectedLocation(null)} onChanged={onChanged} />
      )}
    </div>
  )
}
