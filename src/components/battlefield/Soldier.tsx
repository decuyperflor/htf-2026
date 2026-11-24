import type { SoldierPos } from './types.ts'
import { hash01 } from './geometry.ts'

const STAFF_LENGTH = 26

/** Where the staff of an adventurer points, and where its glowing tip is. */
export function staffTip(soldier: SoldierPos, aim: { x: number; y: number } | null, now: number) {
  const bob = soldier.moving ? 0 : Math.sin(now / 420 + hash01(soldier.codename, 7) * 6) * 1.5
  const sx = soldier.x + 8
  const sy = soldier.y - 4 + bob
  const angle = aim ? Math.atan2(aim.y - sy, aim.x - sx) : -0.3
  return { sx, sy, angle, tx: sx + Math.cos(angle) * STAFF_LENGTH, ty: sy + Math.sin(angle) * STAFF_LENGTH, bob }
}

export function Soldier({
  soldier,
  now,
  aim,
  shooting,
  sleeping = false,
}: {
  soldier: SoldierPos
  now: number
  aim: { x: number; y: number } | null
  shooting: boolean
  /** Logged out: lies down next to the monster with a little "Zzz". */
  sleeping?: boolean
}) {
  const guildMaster = soldier.roleId === 'commander'
  const { sx, sy, tx, ty, bob } = staffTip(soldier, aim, now)
  const body = guildMaster ? '#a995ff' : '#7dd3fc'
  const dark = guildMaster ? '#5b3fd6' : '#2b8bb8'
  // Running legs
  const stride = soldier.moving ? Math.sin(now / 70) * 5 : 0
  const { x, y } = soldier
  const breathe = sleeping ? Math.sin(now / 600) * 0.6 : 0

  return (
    <g>
      <title>{`${soldier.codename} (${guildMaster ? 'guild master' : 'adventurer'}) – ${sleeping ? 'asleep (offline)' : 'online'}`}</title>
      <ellipse cx={x} cy={y + 26} rx={sleeping ? 26 : 16} ry={4} fill="rgb(0 0 0 / 0.35)" />
      <g transform={sleeping ? `rotate(-88 ${x} ${y + 22}) translate(${breathe} 0)` : undefined}>
      <g transform={`translate(0 ${sleeping ? 0 : bob})`}>
        {guildMaster && (
          <path d={`M ${x - 9} ${y - 8} L ${x - 18} ${y + 20} L ${x + 2} ${y + 16} Z`} fill="#ffcf4d" opacity={0.9} />
        )}
        {/* legs */}
        <line x1={x - 4} y1={y + 10} x2={x - 6 + stride} y2={y + 25} stroke={dark} strokeWidth={5} strokeLinecap="round" />
        <line x1={x + 4} y1={y + 10} x2={x + 6 - stride} y2={y + 25} stroke={dark} strokeWidth={5} strokeLinecap="round" />
        {/* body */}
        <rect x={x - 9} y={y - 10} width={18} height={24} rx={6} fill={body} />
        <rect x={x - 9} y={y + 3} width={18} height={3} fill={dark} />
        {/* head + hood / crown */}
        <circle cx={x} cy={y - 18} r={8} fill="#ffe2c6" />
        {guildMaster ? (
          <path d={`M ${x - 8} ${y - 23} L ${x - 8} ${y - 31} L ${x - 4} ${y - 26} L ${x} ${y - 32} L ${x + 4} ${y - 26} L ${x + 8} ${y - 31} L ${x + 8} ${y - 23} Z`} fill="#ffcf4d" />
        ) : (
          <path d={`M ${x - 9} ${y - 16} a 9 9 0 0 1 18 0 L ${x + 9} ${y - 20} Q ${x} ${y - 32} ${x - 9} ${y - 20} Z`} fill={dark} />
        )}
      </g>
      {/* staff with glowing orb */}
      <line x1={sx - (tx - sx) * 0.4} y1={sy - (ty - sy) * 0.4} x2={tx} y2={ty} stroke="#8b5a2b" strokeWidth={3.5} strokeLinecap="round" />
      <circle cx={tx} cy={ty} r={shooting ? 5 + Math.sin(now / 40) * 2 : 3.5} fill={guildMaster ? '#ffcf4d' : '#7df9ff'} opacity={0.95} />
      {shooting && <circle cx={tx} cy={ty} r={10} fill={guildMaster ? '#ffcf4d' : '#7df9ff'} opacity={0.25} />}
      </g>
      {sleeping &&
        [0, 1, 2].map((k) => {
          const p = (now / 2400 + k / 3) % 1
          return (
            <text
              key={k}
              x={x + 14 + p * 22}
              y={y + 8 - p * 40}
              fontSize={10 + p * 10}
              fontWeight={800}
              fill="#6f5a99"
              opacity={Math.sin(p * Math.PI)}
            >
              z
            </text>
          )
        })}
      <text
        x={x}
        y={y + 42}
        textAnchor="middle"
        fontSize="12"
        fontWeight={700}
        fill="#2b2340"
        stroke="#fffaf0"
        strokeWidth={3}
        paintOrder="stroke"
      >
        {soldier.codename}
        {sleeping ? ' 💤' : ''}
      </text>
    </g>
  )
}
