/**
 * Monster figures, one per monster type in the index. Each is drawn centred on
 * 0,0, facing left (towards the adventurers), roughly inside radius `r`.
 * `t` is the animation clock in ms.
 */
export function MonsterBody({ monsterId, r, t }: { monsterId: string; r: number; t: number }) {
  switch (monsterId) {
    case 'goblin':
      return <Goblin r={r} t={t} />
    case 'wraith':
      return <Wraith r={r} t={t} />
    case 'golem':
      return <Golem r={r} t={t} />
    case 'dragon':
      return <Dragon r={r} t={t} />
    default:
      return <Slime r={r} t={t} />
  }
}

function Eye({ x, y, r, fill = '#fff', pupil = '#14081f' }: { x: number; y: number; r: number; fill?: string; pupil?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill={fill} />
      <circle cx={x - r * 0.35} cy={y} r={r * 0.5} fill={pupil} />
    </g>
  )
}

function Slime({ r, t }: { r: number; t: number }) {
  const squish = 1 + Math.sin(t / 260) * 0.06
  return (
    <g transform={`scale(${1 / squish} ${squish})`}>
      <path
        d={`M ${-r} ${r * 0.6} Q ${-r * 1.05} ${-r * 0.75} 0 ${-r * 0.8} Q ${r * 1.05} ${-r * 0.75} ${r} ${r * 0.6} Q 0 ${r * 0.85} ${-r} ${r * 0.6} Z`}
        fill="#5ee38a"
        fillOpacity={0.9}
        stroke="#1f9e52"
        strokeWidth={2}
      />
      <ellipse cx={-r * 0.35} cy={-r * 0.45} rx={r * 0.22} ry={r * 0.12} fill="#fff" opacity={0.5} />
      <Eye x={-r * 0.4} y={-r * 0.05} r={r * 0.17} />
      <Eye x={r * 0.05} y={-r * 0.05} r={r * 0.17} />
    </g>
  )
}

function Goblin({ r, t }: { r: number; t: number }) {
  const hop = Math.abs(Math.sin(t / 180)) * r * 0.08
  return (
    <g transform={`translate(0 ${-hop})`}>
      {/* body */}
      <rect x={-r * 0.35} y={r * 0.25} width={r * 0.7} height={r * 0.6} rx={r * 0.2} fill="#5d7f2c" />
      {/* ears */}
      <polygon points={`${-r * 0.55},${-r * 0.2} ${-r * 1.05},${-r * 0.55} ${-r * 0.45},${r * 0.05}`} fill="#7fae3e" />
      <polygon points={`${r * 0.55},${-r * 0.2} ${r * 1.05},${-r * 0.55} ${r * 0.45},${r * 0.05}`} fill="#7fae3e" />
      {/* head */}
      <ellipse cx={0} cy={-r * 0.1} rx={r * 0.62} ry={r * 0.52} fill="#8fc24a" stroke="#4d6b22" strokeWidth={2} />
      <Eye x={-r * 0.25} y={-r * 0.2} r={r * 0.14} fill="#ffdf3d" pupil="#c0141c" />
      <Eye x={r * 0.15} y={-r * 0.2} r={r * 0.14} fill="#ffdf3d" pupil="#c0141c" />
      {/* grin */}
      <path d={`M ${-r * 0.35} ${r * 0.12} Q 0 ${r * 0.35} ${r * 0.3} ${r * 0.12}`} fill="#2a1408" />
      <polygon points={`${-r * 0.2},${r * 0.15} ${-r * 0.13},${r * 0.27} ${-r * 0.06},${r * 0.16}`} fill="#fff" />
      <polygon points={`${r * 0.05},${r * 0.17} ${r * 0.12},${r * 0.28} ${r * 0.19},${r * 0.15}`} fill="#fff" />
    </g>
  )
}

function Wraith({ r, t }: { r: number; t: number }) {
  const float = Math.sin(t / 500) * r * 0.1
  const w = (i: number) => Math.sin(t / 200 + i) * r * 0.1
  return (
    <g transform={`translate(0 ${float})`}>
      <path
        d={`M ${-r * 0.7} ${r * 0.3}
            Q ${-r * 0.75} ${-r * 0.95} 0 ${-r * 0.95}
            Q ${r * 0.75} ${-r * 0.95} ${r * 0.7} ${r * 0.3}
            L ${r * 0.9} ${r * 0.85 + w(1)}
            Q ${r * 0.5} ${r * 0.6} ${r * 0.3} ${r * 0.9 + w(2)}
            Q ${0} ${r * 0.6} ${-r * 0.3} ${r * 0.9 + w(3)}
            Q ${-r * 0.5} ${r * 0.6} ${-r * 0.9} ${r * 0.85 + w(4)} Z`}
        fill="#c9b8ff"
        fillOpacity={0.75}
        stroke="#8f74ff"
        strokeWidth={2}
      />
      <ellipse cx={-r * 0.3} cy={-r * 0.35} rx={r * 0.13} ry={r * 0.2} fill="#14081f" />
      <ellipse cx={r * 0.12} cy={-r * 0.35} rx={r * 0.13} ry={r * 0.2} fill="#14081f" />
      <ellipse cx={-r * 0.1} cy={r * 0.05} rx={r * 0.12} ry={r * 0.16 + Math.sin(t / 300) * r * 0.04} fill="#14081f" />
    </g>
  )
}

function Golem({ r, t }: { r: number; t: number }) {
  const glow = 0.6 + Math.sin(t / 400) * 0.4
  return (
    <g>
      {/* arms */}
      <rect x={-r * 1.0} y={-r * 0.25} width={r * 0.35} height={r * 0.9} rx={r * 0.08} fill="#6b7080" />
      <rect x={r * 0.65} y={-r * 0.25} width={r * 0.35} height={r * 0.9} rx={r * 0.08} fill="#6b7080" />
      {/* body */}
      <rect x={-r * 0.65} y={-r * 0.45} width={r * 1.3} height={r * 1.25} rx={r * 0.15} fill="#8a8f9c" stroke="#4a4e5a" strokeWidth={2} />
      <line x1={-r * 0.65} y1={r * 0.15} x2={r * 0.65} y2={r * 0.15} stroke="#4a4e5a" strokeWidth={2} />
      <line x1={0} y1={r * 0.15} x2={0} y2={r * 0.8} stroke="#4a4e5a" strokeWidth={2} />
      {/* head */}
      <rect x={-r * 0.4} y={-r * 0.95} width={r * 0.8} height={r * 0.55} rx={r * 0.1} fill="#9aa0ad" stroke="#4a4e5a" strokeWidth={2} />
      <rect x={-r * 0.28} y={-r * 0.75} width={r * 0.18} height={r * 0.12} fill="#2de2ff" opacity={glow} />
      <rect x={r * 0.06} y={-r * 0.75} width={r * 0.18} height={r * 0.12} fill="#2de2ff" opacity={glow} />
      {/* rune */}
      <path
        d={`M ${-r * 0.2} ${-r * 0.25} L 0 ${-r * 0.05} L ${r * 0.2} ${-r * 0.25} M 0 ${-r * 0.05} L 0 ${r * 0.05}`}
        stroke="#2de2ff"
        strokeWidth={2.5}
        fill="none"
        opacity={glow}
      />
    </g>
  )
}

function Dragon({ r, t }: { r: number; t: number }) {
  const flap = Math.sin(t / 220)
  return (
    <g>
      {/* tail */}
      <path d={`M ${r * 0.5} ${r * 0.2} Q ${r * 1.1} ${r * 0.1} ${r * 1.05} ${-r * 0.35}`} stroke="#b3271d" strokeWidth={r * 0.18} fill="none" strokeLinecap="round" />
      <polygon points={`${r * 1.05},${-r * 0.55} ${r * 0.9},${-r * 0.3} ${r * 1.2},${-r * 0.3}`} fill="#ffb547" />
      {/* wing (flaps) */}
      <path
        d={`M ${-r * 0.1} ${-r * 0.2} L ${r * 0.35} ${-r * (0.95 + flap * 0.25)} L ${r * 0.75} ${-r * (0.55 + flap * 0.15)} L ${r * 0.45} ${-r * 0.1} Z`}
        fill="#7a1a14"
        stroke="#ff4d3d"
        strokeWidth={1.5}
      />
      {/* body */}
      <ellipse cx={r * 0.15} cy={r * 0.15} rx={r * 0.6} ry={r * 0.42} fill="#e0463a" stroke="#8a1c14" strokeWidth={2} />
      <ellipse cx={r * 0.15} cy={r * 0.3} rx={r * 0.4} ry={r * 0.2} fill="#ffb08a" />
      {/* legs */}
      <rect x={-r * 0.2} y={r * 0.45} width={r * 0.18} height={r * 0.3} rx={r * 0.06} fill="#b3271d" />
      <rect x={r * 0.35} y={r * 0.45} width={r * 0.18} height={r * 0.3} rx={r * 0.06} fill="#b3271d" />
      {/* neck + head */}
      <path d={`M ${-r * 0.25} ${0} Q ${-r * 0.45} ${-r * 0.35} ${-r * 0.55} ${-r * 0.45}`} stroke="#e0463a" strokeWidth={r * 0.28} fill="none" strokeLinecap="round" />
      <ellipse cx={-r * 0.7} cy={-r * 0.5} rx={r * 0.32} ry={r * 0.2} fill="#e0463a" stroke="#8a1c14" strokeWidth={2} />
      <polygon points={`${-r * 0.55},${-r * 0.68} ${-r * 0.45},${-r * 0.95} ${-r * 0.42},${-r * 0.62}`} fill="#ffdf3d" />
      <circle cx={-r * 0.75} cy={-r * 0.56} r={r * 0.07} fill="#ffdf3d" />
      {/* time-loop breath */}
      <circle cx={-r * 1.15} cy={-r * 0.45} r={r * (0.12 + Math.abs(flap) * 0.08)} fill="none" stroke="#2de2ff" strokeWidth={2} opacity={0.8} />
    </g>
  )
}
