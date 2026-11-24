import { useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import type { GlitchListItem, GlitchStatus } from '#/lib/glitch.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'
import { BattlefieldHud } from './BattlefieldHud.tsx'
import { GlitchSprite } from './GlitchSprite.tsx'
import { Soldier } from './Soldier.tsx'
import { DEATH_MS, DEFENSE_LINE_X, MIN_VIEW_WIDTH, SHOOT_MS, hash01, sizeFor } from './geometry.ts'

/** Units per second a LEAKED glitch walks towards the defenders. */
const WALK_SPEED = 12

export type GlitchSim = {
  id: string
  description: string
  echoCount: number
  status: GlitchStatus
  /** performance.now() of the last status change. */
  statusSince: number
  bornAt: number
  /** Set once the glitch is FIXED (or deleted): it gets shot and explodes. */
  dyingSince: number | null
  x: number
  y: number
  tx: number
  ty: number
  size: number
  targetSize: number
}

export type SoldierPos = GuardianSummary & { x: number; y: number }

type View = { W: number; H: number }

function spawn(glitch: GlitchListItem, now: number, firstLoad: boolean, { W, H }: View): GlitchSim {
  const r1 = hash01(glitch.glitchId, 1)
  const r2 = hash01(glitch.glitchId, 2)
  const r3 = hash01(glitch.glitchId, 3)
  const x = W - 50 - r1 * 70
  const y = 55 + r2 * (H - 110)
  const tx = DEFENSE_LINE_X + 80 + r3 * Math.max(60, (W - DEFENSE_LINE_X) * 0.3)
  const ty = H / 2 + (y - H / 2) * 0.7
  // Already past LEAKED when the page opened: it walked up to the line earlier.
  const arrived = firstLoad && glitch.status !== 'LEAKED'
  return {
    id: glitch.glitchId,
    description: glitch.description,
    echoCount: glitch.echoCount,
    status: glitch.status,
    statusSince: now - 10_000,
    bornAt: firstLoad ? now - 10_000 : now,
    dyingSince: null,
    x: arrived ? tx : x,
    y: arrived ? ty : y,
    tx,
    ty,
    size: sizeFor(glitch.echoCount),
    targetSize: sizeFor(glitch.echoCount),
  }
}

function layoutSoldiers(guardians: GuardianSummary[], H: number): SoldierPos[] {
  const column = (list: GuardianSummary[], x: number) =>
    list.map((g, i) => ({ ...g, x: x + (i % 2) * 18, y: (H * (i + 1)) / (list.length + 1) }))
  return [
    ...column(guardians.filter((g) => g.roleId === 'commander'), 80),
    ...column(guardians.filter((g) => g.roleId !== 'commander'), 175),
  ]
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
        // FIXED before we ever saw it: nothing left to destroy.
        if (g.status !== 'FIXED') sims.current.set(g.glitchId, spawn(g, t, firstSync.current, view))
        continue
      }
      sim.description = g.description
      sim.echoCount = g.echoCount
      sim.targetSize = sizeFor(g.echoCount)
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
      for (const sim of sims.current.values()) {
        sim.size += (sim.targetSize - sim.size) * Math.min(1, dt * 3)
        if (sim.dyingSince === null && sim.status === 'LEAKED') {
          const dx = sim.tx - sim.x
          const dy = sim.ty - sim.y
          const d = Math.hypot(dx, dy)
          if (d > 0.5) {
            const v = Math.min(d, WALK_SPEED * dt)
            sim.x += (dx / d) * v
            sim.y += (dy / d) * v
          }
        }
        // Keep the glitch (and its ring/cage) inside the field as it grows.
        const v = viewRef.current
        if (v) {
          const m = sim.size * 2.2 + 6
          sim.y = Math.min(Math.max(sim.y, m), Math.max(m, v.H - m - 14))
          sim.ty = Math.min(Math.max(sim.ty, m), Math.max(m, v.H - m - 14))
          sim.x = Math.min(sim.x, v.W - m)
        }
        if (sim.dyingSince !== null && t - sim.dyingSince > DEATH_MS) sims.current.delete(sim.id)
      }
      setNow(t)
      raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [])

  const W = view?.W ?? MIN_VIEW_WIDTH
  const H = view?.H ?? 360
  const soldiers = layoutSoldiers(guardians, H)
  const all = [...sims.current.values()]
  // Glitches currently being shot at.
  const targets = now === null ? [] : all.filter((s) => s.dyingSince !== null && now - s.dyingSince < SHOOT_MS)

  return (
    <div ref={boxRef} className="relative h-full w-full overflow-hidden rounded-3xl bg-[#120c2e]">
      {now !== null && view !== null && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 size-full select-none"
          role="img"
          aria-label="Battlefield: guardians defending Achrona against glitches"
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
            DESYNC ZONE
          </text>
          {/* Defense line */}
          <line x1={DEFENSE_LINE_X} y1={12} x2={DEFENSE_LINE_X} y2={H - 12} stroke="rgb(125 211 252 / 0.35)" strokeDasharray="6 8" strokeWidth={2} />

          {soldiers.map((s) => (
            <Soldier key={s.guardianId} soldier={s} now={now} targets={targets} glitches={all} />
          ))}

          {all.map((sim) => (
            <GlitchSprite
              key={sim.id}
              sim={sim}
              now={now}
              soldiers={soldiers}
              onOpen={() => navigate({ to: '/glitches/$glitchId', params: { glitchId: sim.id } })}
            />
          ))}

          {all.length === 0 && (
            <text x={W / 2 + 120} y={H / 2} textAnchor="middle" fontSize="16" fill="rgb(255 255 255 / 0.35)">
              All quiet in Achrona…
            </text>
          )}
        </svg>
      )}
      <BattlefieldHud glitches={glitches} />
    </div>
  )
}
