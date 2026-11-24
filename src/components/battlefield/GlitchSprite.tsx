import type { KeyboardEvent } from 'react'
import { STATUS_LABELS } from '#/lib/glitch.ts'
import type { GlitchSim, SoldierPos } from './types.ts'
import { MonsterBody } from './MonsterBody.tsx'
import { staffTip } from './Soldier.tsx'
import { SHOOT_MS, clamp01, easeOutBack, easeOutCubic, hash01 } from './geometry.ts'

const SHARDS = 14

function shard(r: number) {
  return `${-r},0 ${r * 0.5},${-r * 0.87} ${r * 0.5},${r * 0.87}`
}

/** One monster (glitch) on the battlefield, with its phase effects. */
export function GlitchSprite({
  sim,
  now,
  attackers,
  onOpen,
}: {
  sim: GlitchSim
  now: number
  /** Adventurers attacking it (only while it is being slain). */
  attackers: { soldier: SoldierPos; aim: { x: number; y: number } | null }[]
  onOpen: () => void
}) {
  const seed = hash01(sim.id, 9) * 100
  const r = sim.size
  const dying = sim.dyingSince !== null ? now - sim.dyingSince : null
  const exploding = dying !== null && dying >= SHOOT_MS
  const sinceStatus = now - sim.statusSince

  // Glitchy jitter: mostly still, with short bursts. Caged monsters struggle harder.
  const burst = Math.sin(now / 260 + seed) > 0.8
  const struggle = sim.status === 'CONTAINING' ? 2.5 : 1
  const jx = burst ? Math.sin(now / 23 + seed) * 2.2 * struggle : 0
  const jy = burst ? Math.cos(now / 29 + seed) * 1.6 * struggle : 0
  const walkBob = sim.status === 'LEAKED' && dying === null ? Math.sin(now / 160 + seed) * 2 : 0
  const appear = easeOutBack(clamp01((now - sim.bornAt) / 600))
  const hit = dying !== null && dying > SHOOT_MS * 0.4 && Math.floor(now / 50) % 2 === 0

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <g>
      {/* Magic bolts from the attacking adventurers */}
      {dying !== null &&
        !exploding &&
        attackers.map(({ soldier, aim }, i) => {
          const { tx, ty } = staffTip(soldier, aim, now)
          return [0, 1, 2].map((k) => {
            const p = ((dying / 220 + i * 0.27 + k / 3) % 1 + 1) % 1
            const back = 0.07
            const color = soldier.roleId === 'commander' ? '#E3C47A' : '#39C3D6'
            return (
              <line
                key={`${soldier.guardianId}-${k}`}
                x1={tx + (sim.x - tx) * Math.max(0, p - back)}
                y1={ty + (sim.y - ty) * Math.max(0, p - back)}
                x2={tx + (sim.x - tx) * p}
                y2={ty + (sim.y - ty) * p}
                stroke={color}
                strokeWidth={3.5}
                strokeLinecap="round"
              />
            )
          })
        })}

      <g
        transform={`translate(${sim.x + jx} ${sim.y + jy + walkBob})`}
        role="button"
        tabIndex={0}
        aria-label={`${sim.id}, ${sim.monsterName}, ${STATUS_LABELS[sim.status]}, ${sim.echoCount} sightings: ${sim.description}`}
        onClick={onOpen}
        onKeyDown={onKey}
        className="cursor-pointer outline-none"
      >
        <title>{`${sim.id} · ${sim.monsterName} · ${STATUS_LABELS[sim.status]} · ${sim.echoCount} sighting(s)\n${sim.description}`}</title>

        {!exploding && (
          <g transform={`scale(${appear})`}>
            {/* Glitch aura: red/cyan offset outlines during bursts */}
            {burst && (
              <>
                <ellipse rx={r * 0.95} ry={r * 0.8} transform={`translate(${-3 - jx} 0)`} fill="none" stroke="#B3263E" strokeWidth={1.6} opacity={0.7} />
                <ellipse rx={r * 0.95} ry={r * 0.8} transform={`translate(${3 + jx} 0)`} fill="none" stroke="#39C3D6" strokeWidth={1.6} opacity={0.6} />
              </>
            )}
            <g opacity={hit ? 0.45 : 1}>
              <MonsterBody monsterId={sim.monsterId} r={r} t={now + seed * 37} />
            </g>
            {hit && <circle r={r * 0.9} fill="#ffffff" opacity={0.35} />}
            {burst && <rect x={-r} y={-r * 0.2 + jy * 2} width={r * 1.8} height={1.5} fill="#39C3D6" opacity={0.8} />}
          </g>
        )}

        {/* ASSESSING (scouting): pulsing red ring */}
        {sim.status === 'ASSESSING' && dying === null && (
          <g>
            <circle
              r={r * 1.5 + Math.sin(now / 180) * 3}
              fill="rgb(179 38 62 / 0.08)"
              stroke="#E06A7C"
              strokeWidth={2.5}
              opacity={0.6 + Math.sin(now / 180) * 0.4}
            />
            <circle r={r * 1.9} fill="none" stroke="#C9A24B" strokeWidth={1.2} strokeDasharray="2 6" transform={`rotate(${(now / 20) % 360})`} opacity={0.7} />
          </g>
        )}

        {/* CONTAINING (engaged): a cage slams shut around it */}
        {sim.status === 'CONTAINING' && dying === null && (() => {
          const k = easeOutCubic(clamp01(sinceStatus / 600))
          const side = r * 2.5 * (2 - k)
          const bars = 4
          return (
            <g opacity={k}>
              <rect x={-side / 2} y={-side / 2} width={side} height={side} rx={1} fill="rgb(57 195 214 / 0.08)" stroke="#C9A24B" strokeWidth={2.5} />
              {Array.from({ length: bars }, (_, i) => {
                const x = -side / 2 + ((i + 1) * side) / (bars + 1)
                return <line key={i} x1={x} y1={-side / 2} x2={x} y2={side / 2} stroke="#C9A24B" strokeWidth={1.4} opacity={0.85} />
              })}
            </g>
          )
        })()}

        {/* FIXED (slain): explosion */}
        {exploding && (() => {
          const t = clamp01((dying - SHOOT_MS) / 1000)
          const e = easeOutCubic(t)
          return (
            <g>
              <circle r={r * (0.8 + e * 3)} fill="url(#bf-blast)" opacity={1 - t} />
              <circle r={r * (1 + e * 4)} fill="none" stroke="#E3C47A" strokeWidth={3 * (1 - t)} opacity={1 - t} />
              {Array.from({ length: SHARDS }, (_, i) => {
                const a = (i / SHARDS) * Math.PI * 2 + hash01(sim.id, i) * 0.5
                const dist = r * (0.5 + e * (2.5 + hash01(sim.id, i + 20) * 2))
                const s = 3 + hash01(sim.id, i + 40) * 5
                return (
                  <polygon
                    key={i}
                    points={shard(s)}
                    transform={`translate(${Math.cos(a) * dist} ${Math.sin(a) * dist}) rotate(${t * 540 + i * 40})`}
                    fill={i % 2 ? '#B3263E' : '#39C3D6'}
                    opacity={1 - t}
                  />
                )
              })}
            </g>
          )
        })()}

        {!exploding && (
          <text y={r * 1.9 + 14} textAnchor="middle" fontSize="10" fontFamily="Cinzel, Georgia, serif" fontWeight={700} fill="#E9E2CF" opacity={0.8}>
            {sim.id}
          </text>
        )}
      </g>
    </g>
  )
}
