import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { GlitchListItem, GlitchStatus } from '#/lib/glitch.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'
import { BattlefieldHud } from './BattlefieldHud.tsx'
import { GlitchSprite } from './GlitchSprite.tsx'
import { Soldier } from './Soldier.tsx'
import { DEATH_MS, DEFENSE_LINE_X, MIN_VIEW_WIDTH, SHOOT_MS, hash01, sizeFor } from './geometry.ts'

/** Units per second a spotted (LEAKED) monster walks towards the guild. */
const WALK_SPEED = 12
/** Units per second an adventurer runs out to (or back from) a monster. */
const RUN_SPEED = 110

export type GlitchSim = {
  id: string
  description: string
  monsterId: string
  monsterName: string
  danger: number
  echoCount: number
  assignedGuardianIds: number[]
  status: GlitchStatus
  /** performance.now() of the last status change. */
  statusSince: number
  bornAt: number
  /** Set once the glitch is FIXED (or deleted): it gets attacked and explodes. */
  dyingSince: number | null
  x: number
  y: number
  tx: number
  ty: number
  size: number
  targetSize: number
}

export type SoldierPos = GuardianSummary & {
  x: number
  y: number
  moving: boolean
}

type SoldierSim = { x: number; y: number; moving: boolean }
type View = { W: number; H: number }

function spawn(glitch: GlitchListItem, now: number, firstLoad: boolean, { W, H }: View): GlitchSim {
  const r1 = hash01(glitch.glitchId, 1)
  const r2 = hash01(glitch.glitchId, 2)
  const r3 = hash01(glitch.glitchId, 3)
  const x = W - 50 - r1 * 70
  const y = 55 + r2 * (H - 110)
  const tx = DEFENSE_LINE_X + 120 + r3 * Math.max(60, (W - DEFENSE_LINE_X) * 0.35)
  const ty = H / 2 + (y - H / 2) * 0.7
  // Already past LEAKED when the page opened: it walked up earlier.
  const arrived = firstLoad && glitch.status !== 'LEAKED'
  const size = sizeFor(glitch.echoCount, glitch.danger)
  return {
    id: glitch.glitchId,
    description: glitch.description,
    monsterId: glitch.monsterId,
    monsterName: glitch.monsterName,
    danger: glitch.danger,
    echoCount: glitch.echoCount,
    assignedGuardianIds: glitch.assignedGuardianIds,
    status: glitch.status,
    statusSince: now - 10_000,
    bornAt: firstLoad ? now - 10_000 : now,
    dyingSince: null,
    x: arrived ? tx : x,
    y: arrived ? ty : y,
    tx,
    ty,
    size,
    targetSize: size,
  }
}

/** Home positions: guild masters in the back, adventurers at the defense line. */
function homePositions(guardians: GuardianSummary[], H: number) {
  const homes = new Map<number, { x: number; y: number }>()
  const column = (list: GuardianSummary[], x: number) =>
    list.forEach((g, i) => homes.set(g.guardianId, { x: x + (i % 2) * 18, y: (H * (i + 1)) / (list.length + 1) }))
  column(guardians.filter((g) => g.roleId === 'commander'), 80)
  column(guardians.filter((g) => g.roleId !== 'commander'), 175)
  return homes
}

/** A glitch an adventurer should be fighting right now (alive, or still being attacked). */
function missionOf(guardianId: number, sims: Iterable<GlitchSim>, now: number) {
  for (const g of sims) {
    if (!g.assignedGuardianIds.includes(guardianId)) continue
    if (g.dyingSince === null || now - g.dyingSince < SHOOT_MS) return g
  }
  return null
}

export function Battlefield({
  glitches,
  guardians,
}: {
  glitches: GlitchListItem[]
  guardians: GuardianSummary[]
}) {
  const navigate = useNavigate()
  const sims = useRef(new Map<string, GlitchSim>())
  const soldierSims = useRef(new Map<number, SoldierSim>())
  const guardiansRef = useRef(guardians)
  guardiansRef.current = guardians
  const firstSync = useRef(true)
  // Animation clock; also the render trigger for every frame.
  const [now, setNow] = useState<number | null>(null)

  // The SVG uses the box's own aspect ratio, so the scene always fills it.
  const boxRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View | null>(null)
  const viewRef = useRef<View | null>(null)
  viewRef.current = view
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const { width, height } = box.getBoundingClientRect()
      if (!width || !height) return
      const W = Math.max(MIN_VIEW_WIDTH, width)
      setView({ W, H: (W * height) / width })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(box)
    return () => observer.disconnect()
  }, [])

  // Reconcile server data with what is on screen; status *changes* drive the animations.
  useEffect(() => {
    if (!view) return
    const t = performance.now()
    const seen = new Set<string>()
    for (const g of glitches) {
      seen.add(g.glitchId)
      const sim = sims.current.get(g.glitchId)
      if (!sim) {
        // Slain before we ever saw it: nothing left to fight.
        if (g.status !== 'FIXED') sims.current.set(g.glitchId, spawn(g, t, firstSync.current, view))
        continue
      }
      sim.description = g.description
      sim.monsterId = g.monsterId
      sim.monsterName = g.monsterName
      sim.danger = g.danger
      sim.echoCount = g.echoCount
      sim.assignedGuardianIds = g.assignedGuardianIds
      sim.targetSize = sizeFor(g.echoCount, g.danger)
      if (sim.status !== g.status) {
        sim.status = g.status
        sim.statusSince = t
        sim.dyingSince = g.status === 'FIXED' ? (sim.dyingSince ?? t) : null
      }
    }
    // Deleted glitches get destroyed too.
    for (const sim of sims.current.values()) {
      if (!seen.has(sim.id) && sim.dyingSince === null) sim.dyingSince = t
    }
    firstSync.current = false
  }, [glitches, view !== null])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000)
      last = t
      const v = viewRef.current

      for (const sim of sims.current.values()) {
        sim.size += (sim.targetSize - sim.size) * Math.min(1, dt * 3)
        if (sim.dyingSince === null && sim.status === 'LEAKED') {
          const dx = sim.tx - sim.x
          const dy = sim.ty - sim.y
          const d = Math.hypot(dx, dy)
          if (d > 0.5) {
            const step = Math.min(d, WALK_SPEED * dt)
            sim.x += (dx / d) * step
            sim.y += (dy / d) * step
          }
        }
        // Keep the monster (and its ring/cage) inside the field as it grows.
        if (v) {
          const m = sim.size * 2.2 + 6
          sim.y = Math.min(Math.max(sim.y, m), Math.max(m, v.H - m - 14))
          sim.ty = Math.min(Math.max(sim.ty, m), Math.max(m, v.H - m - 14))
          sim.x = Math.min(sim.x, v.W - m)
        }
        if (sim.dyingSince !== null && t - sim.dyingSince > DEATH_MS) sims.current.delete(sim.id)
      }

      // Monsters push each other apart so they never stand on top of one another.
      const live = [...sims.current.values()].filter((s) => s.dyingSince === null)
      for (let i = 0; i < live.length; i++) {
        for (let j = i + 1; j < live.length; j++) {
          const a = live[i]
          const b = live[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const d = Math.hypot(dx, dy) || 0.01
          const min = (a.size + b.size) * 1.6
          if (d < min) {
            const push = Math.min(min - d, 60 * dt) / 2
            a.x -= (dx / d) * push
            a.y -= (dy / d) * push
            b.x += (dx / d) * push
            b.y += (dy / d) * push
            // Let a walking monster settle where it was pushed instead of walking back.
            if (a.status === 'LEAKED') { a.tx = a.x; a.ty = a.y }
            if (b.status === 'LEAKED') { b.tx = b.x; b.ty = b.y }
          }
        }
      }

      // Adventurers run out to their assigned monster and come back afterwards.
      if (v) {
        const homes = homePositions(guardiansRef.current, v.H)
        for (const [id, home] of homes) {
          const s = soldierSims.current.get(id) ?? { ...home, moving: false }
          let target = home
          const mission = missionOf(id, sims.current.values(), t)
          if (mission) {
            const squad = mission.assignedGuardianIds.filter((g) => homes.has(g))
            const i = squad.indexOf(id)
            target = {
              x: mission.x - (mission.size * 2.2 + 34),
              y: mission.y + (i - (squad.length - 1) / 2) * 38,
            }
          }
          const dx = target.x - s.x
          const dy = target.y - s.y
          const d = Math.hypot(dx, dy)
          s.moving = d > 1
          if (s.moving) {
            const step = Math.min(d, RUN_SPEED * dt)
            s.x += (dx / d) * step
            s.y += (dy / d) * step
          }
          soldierSims.current.set(id, s)
        }
        for (const id of soldierSims.current.keys()) if (!homes.has(id)) soldierSims.current.delete(id)
      }

      setNow(t)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  const W = view?.W ?? MIN_VIEW_WIDTH
  const H = view?.H ?? 360
  const all = [...sims.current.values()]
  const soldiers: SoldierPos[] = guardians.flatMap((g) => {
    const s = soldierSims.current.get(g.guardianId)
    return s ? [{ ...g, x: s.x, y: s.y, moving: s.moving }] : []
  })
  const onField = new Set(soldiers.map((s) => s.guardianId))

  /** Who attacks a dying monster: its assigned adventurers, or everyone if nobody was sent. */
  const attackersOf = (g: GlitchSim) => {
    const squad = g.assignedGuardianIds.filter((id) => onField.has(id))
    return squad.length ? soldiers.filter((s) => squad.includes(s.guardianId)) : soldiers
  }

  // What each soldier aims at: its mission, a monster it is attacking, or the closest live monster.
  const aimOf = (s: SoldierPos): GlitchSim | null => {
    if (now === null) return null
    const mission = missionOf(s.guardianId, all, now)
    if (mission) return mission
    const attacking = all.find(
      (g) => g.dyingSince !== null && now - g.dyingSince < SHOOT_MS && attackersOf(g).includes(s),
    )
    if (attacking) return attacking
    let best: GlitchSim | null = null
    for (const g of all) {
      if (g.dyingSince !== null) continue
      if (!best || Math.hypot(g.x - s.x, g.y - s.y) < Math.hypot(best.x - s.x, best.y - s.y)) best = g
    }
    return best
  }

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden rounded-3xl bg-[#120c2e]">
      {now !== null && view !== null && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 size-full select-none"
          role="img"
          aria-label="Battlefield: the guild defending Achrona against monsters"
        >
          <defs>
            <pattern id="bf-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgb(255 255 255 / 0.05)" />
            </pattern>
            <linearGradient id="bf-zone" x1="0" x2="1">
              <stop offset="0" stopColor="#ff2d75" stopOpacity="0" />
              <stop offset="1" stopColor="#ff2d75" stopOpacity="0.12" />
            </linearGradient>
            <radialGradient id="bf-blast">
              <stop offset="0" stopColor="#fff7c2" />
              <stop offset="0.4" stopColor="#ffb547" />
              <stop offset="1" stopColor="#ff2d75" stopOpacity="0" />
            </radialGradient>
          </defs>

          <rect width={W} height={H} fill="url(#bf-grid)" />
          <rect x={W * 0.62} width={W * 0.38} height={H} fill="url(#bf-zone)" />
          <text x={W - 16} y={22} textAnchor="end" fontSize="11" letterSpacing="3" fill="rgb(255 45 117 / 0.5)">
            THE WILDS
          </text>
          {/* Guild wall */}
          <line x1={DEFENSE_LINE_X} y1={12} x2={DEFENSE_LINE_X} y2={H - 12} stroke="rgb(125 211 252 / 0.35)" strokeDasharray="6 8" strokeWidth={2} />

          {soldiers.map((s) => {
            const aim = aimOf(s)
            const shooting =
              now !== null &&
              all.some((g) => g.dyingSince !== null && now - g.dyingSince < SHOOT_MS && attackersOf(g).includes(s))
            return <Soldier key={s.guardianId} soldier={s} now={now} aim={aim} shooting={shooting} />
          })}

          {all.map((sim) => (
            <GlitchSprite
              key={sim.id}
              sim={sim}
              now={now}
              attackers={sim.dyingSince !== null ? attackersOf(sim).map((s) => ({ soldier: s, aim: aimOf(s) })) : []}
              onOpen={() => navigate({ to: '/glitches/$glitchId', params: { glitchId: sim.id } })}
            />
          ))}

          {all.length === 0 && (
            <text x={W / 2 + 120} y={H / 2} textAnchor="middle" fontSize="16" fill="rgb(255 255 255 / 0.35)">
              No monsters in sight. Achrona is safe… for now.
            </text>
          )}
        </svg>
      )}
      <BattlefieldHud glitches={glitches} />
    </div>
  )
}
