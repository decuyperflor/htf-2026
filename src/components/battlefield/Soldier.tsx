import type { GlitchSim, SoldierPos } from './Battlefield.tsx'
import { hash01 } from './geometry.ts'

const GUN_LENGTH = 24

/** Where the gun of a soldier points, and where its muzzle is. */
export function gunTip(soldier: SoldierPos, target: { x: number; y: number } | null, now: number) {
  const bob = Math.sin(now / 420 + hash01(soldier.codename, 7) * 6) * 1.5
  const sx = soldier.x + 8
  const sy = soldier.y - 4 + bob
  const angle = target ? Math.atan2(target.y - sy, target.x - sx) : 0
  return { sx, sy, angle, tx: sx + Math.cos(angle) * GUN_LENGTH, ty: sy + Math.sin(angle) * GUN_LENGTH, bob }
}

export function Soldier({
  soldier,
  now,
  targets,
  glitches,
}: {
  soldier: SoldierPos
  now: number
  targets: GlitchSim[]
  glitches: GlitchSim[]
}) {
  const commander = soldier.roleId === 'commander'
  // Aim at what is being shot; otherwise track the closest live glitch.
  const pool = targets.length ? targets : glitches.filter((g) => g.dyingSince === null)
  let target: GlitchSim | null = null
  for (const g of pool) {
    if (!target || Math.hypot(g.x - soldier.x, g.y - soldier.y) < Math.hypot(target.x - soldier.x, target.y - soldier.y)) {
      target = g
    }
  }
  const { sx, sy, angle, tx, ty, bob } = gunTip(soldier, target, now)
  const shooting = targets.length > 0
  const body = commander ? '#a995ff' : '#7dd3fc'
  const dark = commander ? '#5b3fd6' : '#2b8bb8'

  return (
    <g>
      <title>{`${soldier.codename} (${soldier.roleId})`}</title>
      <ellipse cx={soldier.x} cy={soldier.y + 26} rx={16} ry={4} fill="rgb(0 0 0 / 0.35)" />
      <g transform={`translate(0 ${bob})`}>
        {commander && (
          <path
            d={`M ${soldier.x - 9} ${soldier.y - 8} L ${soldier.x - 18} ${soldier.y + 20} L ${soldier.x + 2} ${soldier.y + 16} Z`}
            fill="#ffcf4d"
            opacity={0.9}
          />
        )}
        {/* legs */}
        <line x1={soldier.x - 4} y1={soldier.y + 10} x2={soldier.x - 6} y2={soldier.y + 25} stroke={dark} strokeWidth={5} strokeLinecap="round" />
        <line x1={soldier.x + 4} y1={soldier.y + 10} x2={soldier.x + 6} y2={soldier.y + 25} stroke={dark} strokeWidth={5} strokeLinecap="round" />
        {/* body */}
        <rect x={soldier.x - 9} y={soldier.y - 10} width={18} height={24} rx={6} fill={body} />
        {commander && (
          <path
            d={`M ${soldier.x} ${soldier.y - 4} l 2 4 4 .5 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -.5 Z`}
            fill="#ffcf4d"
          />
        )}
        {/* head + helmet */}
        <circle cx={soldier.x} cy={soldier.y - 18} r={8} fill="#ffe2c6" />
        <path d={`M ${soldier.x - 9} ${soldier.y - 18} a 9 9 0 0 1 18 0 Z`} fill={dark} />
      </g>
      {/* gun */}
      <line x1={sx} y1={sy} x2={tx} y2={ty} stroke="#d4d4e0" strokeWidth={4} strokeLinecap="round" />
      <line x1={sx} y1={sy} x2={sx + Math.cos(angle) * 9} y2={sy + Math.sin(angle) * 9} stroke="#3a3a4a" strokeWidth={6} strokeLinecap="round" />
      {shooting && Math.floor(now / 60) % 2 === 0 && (
        <circle cx={tx} cy={ty} r={5 + Math.random() * 3} fill="#fff3a3" opacity={0.9} />
      )}
      <text x={soldier.x} y={soldier.y + 42} textAnchor="middle" fontSize="11" fill="rgb(255 255 255 / 0.75)">
        {soldier.codename}
      </text>
    </g>
  )
}
