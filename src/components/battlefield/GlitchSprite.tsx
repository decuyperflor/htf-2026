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
            const color = soldier.roleId === 'commander' ? '#ffcf4d' : '#7df9ff'
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
                <ellipse rx={r * 0.95} ry={r * 0.8} transform={`translate(${-3 - jx} 0)`} fill="none" stroke="#ff2d75" strokeWidth={2} opacity={0.6} />
                <ellipse rx={r * 0.95} ry={r * 0.8} transform={`translate(${3 + jx} 0)`} fill="none" stroke="#2de2ff" strokeWidth={2} opacity={0.5} />
              </>
            )}
            <g opacity={hit ? 0.45 : 1}>
              <MonsterBody monsterId={sim.monsterId} r={r} t={now + seed * 37} />
            </g>
            {hit && <circle r={r * 0.9} fill="#ffffff" opacity={0.35} />}
            {burst && <rect x={-r} y={-r * 0.2 + jy * 2} width={r * 1.8} height={2} fill="#2de2ff" opacity={0.8} />}
          </g>
        )}

        {/* ASSESSING (scouting): pulsing red ring */}
        {sim.status === 'ASSESSING' && dying === null && (
          <g>
            <circle
              r={r * 1.5 + Math.sin(now / 180) * 3}
              fill="rgb(255 45 45 / 0.08)"
              stroke="#ff3b3b"
              strokeWidth={2.5}
              opacity={0.6 + Math.sin(now / 180) * 0.4}
            />
            <circle r={r * 1.9} fill="none" stroke="#ff3b3b" strokeWidth={1.5} strokeDasharray="4 10" transform={`rotate(${(now / 20) % 360})`} opacity={0.7} />
          </g>
        )}

        {/* CONTAINING (engaged): a cage slams shut around it */}
        {sim.status === 'CONTAINING' && dying === null && (() => {
          const k = easeOutCubic(clamp01(sinceStatus / 600))
          const side = r * 2.5 * (2 - k)
          const bars = 4
          return (
            <g opacity={k}>
              <rect x={-side / 2} y={-side / 2} width={side} height={side} rx={4} fill="rgb(45 226 255 / 0.08)" stroke="#2de2ff" strokeWidth={3} />
              {Array.from({ length: bars }, (_, i) => {
                const x = -side / 2 + ((i + 1) * side) / (bars + 1)
                return <line key={i} x1={x} y1={-side / 2} x2={x} y2={side / 2} stroke="#2de2ff" strokeWidth={1.5} opacity={0.7} />
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
              <circle r={r * (1 + e * 4)} fill="none" stroke="#ffb547" strokeWidth={3 * (1 - t)} opacity={1 - t} />
              {Array.from({ length: SHARDS }, (_, i) => {
                const a = (i / SHARDS) * Math.PI * 2 + hash01(sim.id, i) * 0.5
                const dist = r * (0.5 + e * (2.5 + hash01(sim.id, i + 20) * 2))
                const s = 3 + hash01(sim.id, i + 40) * 5
                return (
                  <polygon
                    key={i}
                    points={shard(s)}
                    transform={`translate(${Math.cos(a) * dist} ${Math.sin(a) * dist}) rotate(${t * 540 + i * 40})`}
                    fill={i % 2 ? '#ff4d8d' : '#2de2ff'}
                    opacity={1 - t}
                  />
                )
              })}
            </g>
          )
        })()}

        {!exploding && (
          <text y={r * 1.9 + 14} textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.7)">
            {sim.id}
          </text>
        )}
      </g>
    </g>
  )
}
