import type { KeyboardEvent } from 'react'
import type { GlitchSim, SoldierPos } from './Battlefield.tsx'
import { gunTip } from './Soldier.tsx'
import { SHOOT_MS, clamp01, easeOutBack, easeOutCubic, hash01 } from './geometry.ts'

const SHARDS = 14

/** Triangle pointing left (towards the defenders), centred on 0,0. */
function triangle(r: number) {
  return `${-r},0 ${r * 0.5},${-r * 0.87} ${r * 0.5},${r * 0.87}`
}

export function GlitchSprite({
  sim,
  now,
  soldiers,
  onOpen,
}: {
  sim: GlitchSim
  now: number
  soldiers: SoldierPos[]
  onOpen: () => void
}) {
  const seed = hash01(sim.id, 9) * 100
  const r = sim.size
  const dying = sim.dyingSince !== null ? now - sim.dyingSince : null
  const exploding = dying !== null && dying >= SHOOT_MS
  const sinceStatus = now - sim.statusSince

  // Glitchy jitter: mostly still, with short bursts. Caged glitches struggle harder.
  const burst = Math.sin(now / 260 + seed) > 0.8
  const struggle = sim.status === 'CONTAINING' ? 2.5 : 1
  const jx = burst ? Math.sin(now / 23 + seed) * 2.2 * struggle : 0
  const jy = burst ? Math.cos(now / 29 + seed) * 1.6 * struggle : 0
  const walkBob = sim.status === 'LEAKED' && dying === null ? Math.sin(now / 160 + seed) * 2 : 0
  const appear = easeOutBack(clamp01((now - sim.bornAt) / 600))
  const hit = dying !== null && dying > SHOOT_MS * 0.5 && Math.floor(now / 50) % 2 === 0

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onOpen()
    }
  }

  return (
    <g>
      {/* Bullets from every soldier while it is being destroyed */}
      {dying !== null &&
        !exploding &&
        soldiers.map((s, i) => {
          const { tx, ty } = gunTip(s, sim, now)
          return [0, 1, 2].map((k) => {
            const p = ((dying / 220 + i * 0.27 + k / 3) % 1 + 1) % 1
            const bx = tx + (sim.x - tx) * p
            const by = ty + (sim.y - ty) * p
            const back = 0.06
            return (
              <line
                key={`${s.guardianId}-${k}`}
                x1={tx + (sim.x - tx) * Math.max(0, p - back)}
                y1={ty + (sim.y - ty) * Math.max(0, p - back)}
                x2={bx}
                y2={by}
                stroke="#fff3a3"
                strokeWidth={3}
                strokeLinecap="round"
              />
            )
          })
        })}

      <g
        transform={`translate(${sim.x + jx} ${sim.y + jy + walkBob})`}
        role="button"
        tabIndex={0}
        aria-label={`${sim.id}, ${sim.status}, ${sim.echoCount} echoes: ${sim.description}`}
        onClick={onOpen}
        onKeyDown={onKey}
        className="cursor-pointer outline-none"
      >
        <title>{`${sim.id} · ${sim.status} · ${sim.echoCount} echo(es)\n${sim.description}`}</title>

        {!exploding && (
          <g transform={`scale(${appear})`}>
            {/* Chromatic aberration copies */}
            <polygon points={triangle(r)} transform={`translate(${-2 - jx * 0.6} 0)`} fill="#ff2d75" opacity={0.55} />
            <polygon points={triangle(r)} transform={`translate(${2 + jx * 0.6} 0)`} fill="#2de2ff" opacity={0.45} />
            <polygon points={triangle(r)} fill={hit ? '#ffffff' : '#1a0b2e'} stroke="#ff4d8d" strokeWidth={2.5} />
            <circle cx={r * 0.05} cy={0} r={Math.max(2.5, r * 0.14)} fill={hit ? '#ff2d75' : '#ff4d8d'} />
            {burst && (
              <rect x={-r} y={-r * 0.2 + jy * 2} width={r * 1.6} height={2} fill="#2de2ff" opacity={0.8} />
            )}
          </g>
        )}

        {/* ASSESSING: pulsing red ring */}
        {sim.status === 'ASSESSING' && dying === null && (
          <g>
            <circle
              r={r * 1.7 + Math.sin(now / 180) * 3}
              fill="rgb(255 45 45 / 0.08)"
              stroke="#ff3b3b"
              strokeWidth={2.5}
              opacity={0.6 + Math.sin(now / 180) * 0.4}
            />
            <circle
              r={r * 2.1}
              fill="none"
              stroke="#ff3b3b"
              strokeWidth={1.5}
              strokeDasharray="4 10"
              transform={`rotate(${(now / 20) % 360})`}
              opacity={0.7}
            />
          </g>
        )}

        {/* CONTAINING: a cage slams shut around it */}
        {sim.status === 'CONTAINING' && dying === null && (() => {
          const k = easeOutCubic(clamp01(sinceStatus / 600))
          const side = r * 2.6 * (2 - k)
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

        {/* FIXED: explosion */}
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
                    points={triangle(s)}
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
          <text y={r * 2.2 + 12} textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.7)">
            {sim.id}
          </text>
        )}
      </g>
    </g>
  )
}
