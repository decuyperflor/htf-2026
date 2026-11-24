/**
 * Monster figures, one per monster type in the index, drawn like bestiary
 * engravings in the shield's palette: ink outlines, a lit and a shaded side,
 * hatching for depth, and the cyan glow of the Desync in their eyes and runes.
 * Each is centred on 0,0, facing left (towards the adventurers), roughly inside
 * radius `r`. `t` is the animation clock in ms.
 */
const INK = '#0A1328'
const CYAN = '#39C3D6'
const GOLD = '#C9A24B'
const BONE = '#E9E2CF'

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

/** Parallel hatch strokes from (x, y), `n` lines of length `len` at angle `a`, `gap` apart. */
function hatch(x: number, y: number, n: number, len: number, gap: number, a = Math.PI / 3) {
  const dx = Math.cos(a) * len
  const dy = Math.sin(a) * len
  return Array.from({ length: n }, (_, i) => `M ${x + i * gap} ${y} l ${dx} ${dy}`).join(' ')
}

/** A narrow glowing eye: a slit with a soft halo. */
function GlowEye({ x, y, r, color = CYAN }: { x: number; y: number; r: number; color?: string }) {
  return (
    <g>
      <ellipse cx={x} cy={y} rx={r * 1.6} ry={r * 1.1} fill={color} opacity={0.25} />
      <path d={`M ${x - r} ${y} Q ${x} ${y - r * 0.7} ${x + r} ${y} Q ${x} ${y + r * 0.7} ${x - r} ${y} Z`} fill={color} stroke={INK} strokeWidth={0.6} />
      <line x1={x} y1={y - r * 0.45} x2={x} y2={y + r * 0.45} stroke={INK} strokeWidth={r * 0.3} />
    </g>
  )
}

/** Ooze: a translucent mass with bubbles caught inside. */
function Slime({ r, t }: { r: number; t: number }) {
  const squish = 1 + Math.sin(t / 260) * 0.05
  const body = `M ${-r} ${r * 0.6} Q ${-r * 1.05} ${-r * 0.75} 0 ${-r * 0.8} Q ${r * 1.05} ${-r * 0.75} ${r} ${r * 0.6} Q 0 ${r * 0.85} ${-r} ${r * 0.6} Z`
  return (
    <g transform={`scale(${1 / squish} ${squish})`}>
      <path d={body} fill="#2E6E73" fillOpacity={0.92} stroke={INK} strokeWidth={1.6} />
      <path d={`M ${r * 0.2} ${-r * 0.7} Q ${r * 1.0} ${-r * 0.6} ${r * 0.95} ${r * 0.6} Q ${r * 0.4} ${r * 0.75} ${r * 0.2} ${r * 0.72} Z`} fill={INK} opacity={0.22} />
      <path d={hatch(r * 0.35, -r * 0.35, 5, r * 0.5, r * 0.11)} stroke={INK} strokeWidth={0.6} opacity={0.45} />
      <path d={`M ${-r * 0.75} ${-r * 0.2} Q ${-r * 0.6} ${-r * 0.65} ${-r * 0.1} ${-r * 0.7}`} fill="none" stroke={CYAN} strokeWidth={1.2} opacity={0.7} />
      {[[-0.5, 0.25, 0.08], [0.1, 0.35, 0.06], [0.45, 0.05, 0.05], [-0.15, 0.48, 0.04]].map(([bx, by, br], i) => (
        <circle key={i} cx={r * bx} cy={r * by - Math.sin(t / 400 + i) * r * 0.05} r={r * br} fill="none" stroke={BONE} strokeWidth={0.8} opacity={0.6} />
      ))}
      <GlowEye x={-r * 0.42} y={-r * 0.12} r={r * 0.1} />
      <GlowEye x={-r * 0.08} y={-r * 0.12} r={r * 0.1} />
    </g>
  )
}

/** Goblin: hooded raider with a notched blade. */
function Goblin({ r, t }: { r: number; t: number }) {
  const hop = Math.abs(Math.sin(t / 180)) * r * 0.06
  return (
    <g transform={`translate(0 ${-hop})`} strokeLinejoin="round">
      {/* blade */}
      <path d={`M ${-r * 0.55} ${r * 0.45} L ${-r * 1.05} ${r * 0.05} L ${-r * 0.98} ${r * 0.0} L ${-r * 0.5} ${r * 0.38} Z`} fill="#B9B2A3" stroke={INK} strokeWidth={1} />
      <line x1={-r * 0.5} y1={r * 0.42} x2={-r * 0.42} y2={r * 0.5} stroke="#6B5A3A" strokeWidth={r * 0.08} strokeLinecap="round" />
      {/* cloak */}
      <path d={`M ${-r * 0.45} ${r * 0.15} L ${-r * 0.6} ${r * 0.9} L ${r * 0.6} ${r * 0.9} L ${r * 0.45} ${r * 0.15} Q 0 ${r * 0.05} ${-r * 0.45} ${r * 0.15} Z`} fill="#1A2B4D" stroke={INK} strokeWidth={1.2} />
      <path d={hatch(r * 0.05, r * 0.25, 6, r * 0.5, r * 0.09, Math.PI / 2.4)} stroke={BONE} strokeWidth={0.5} opacity={0.25} />
      <path d={`M ${-r * 0.6} ${r * 0.9} l ${r * 0.15} ${-r * 0.1} l ${r * 0.12} ${r * 0.1} l ${r * 0.15} ${-r * 0.1} l ${r * 0.15} ${r * 0.1}`} fill="none" stroke={INK} strokeWidth={0.8} />
      {/* ears */}
      <path d={`M ${-r * 0.5} ${-r * 0.2} L ${-r * 1.0} ${-r * 0.5} L ${-r * 0.42} ${r * 0.02} Z`} fill="#4F6A3A" stroke={INK} strokeWidth={1} />
      <path d={`M ${r * 0.5} ${-r * 0.2} L ${r * 1.0} ${-r * 0.5} L ${r * 0.42} ${r * 0.02} Z`} fill="#3F5A2E" stroke={INK} strokeWidth={1} />
      {/* head */}
      <ellipse cx={0} cy={-r * 0.1} rx={r * 0.55} ry={r * 0.48} fill="#5E7A45" stroke={INK} strokeWidth={1.2} />
      <path d={`M ${r * 0.1} ${-r * 0.55} Q ${r * 0.6} ${-r * 0.4} ${r * 0.5} ${r * 0.15} Q ${r * 0.3} ${r * 0.35} ${r * 0.05} ${r * 0.36} Z`} fill={INK} opacity={0.25} />
      {/* hood */}
      <path d={`M ${-r * 0.62} ${-r * 0.05} Q ${-r * 0.7} ${-r * 0.75} 0 ${-r * 0.82} Q ${r * 0.7} ${-r * 0.75} ${r * 0.62} ${-r * 0.05} Q ${r * 0.4} ${-r * 0.5} 0 ${-r * 0.52} Q ${-r * 0.4} ${-r * 0.5} ${-r * 0.62} ${-r * 0.05} Z`} fill="#1A2B4D" stroke={INK} strokeWidth={1.2} />
      <path d={`M ${-r * 0.5} ${-r * 0.42} Q 0 ${-r * 0.72} ${r * 0.5} ${-r * 0.42}`} fill="none" stroke={GOLD} strokeWidth={0.8} />
      <GlowEye x={-r * 0.24} y={-r * 0.15} r={r * 0.09} color="#E3C47A" />
      <GlowEye x={r * 0.12} y={-r * 0.15} r={r * 0.09} color="#E3C47A" />
      {/* mouth with two fangs */}
      <path d={`M ${-r * 0.28} ${r * 0.14} Q ${-r * 0.05} ${r * 0.22} ${r * 0.2} ${r * 0.14}`} fill="none" stroke={INK} strokeWidth={1.2} />
      <path d={`M ${-r * 0.18} ${r * 0.16} l ${r * 0.04} ${r * 0.09} l ${r * 0.04} ${-r * 0.08} M ${r * 0.06} ${r * 0.17} l ${r * 0.04} ${r * 0.09} l ${r * 0.04} ${-r * 0.09}`} fill={BONE} stroke={INK} strokeWidth={0.5} />
    </g>
  )
}

/** Wraith: a tattered shroud, hollow-eyed, trailing chains. */
function Wraith({ r, t }: { r: number; t: number }) {
  const float = Math.sin(t / 500) * r * 0.1
  const w = (i: number) => Math.sin(t / 200 + i) * r * 0.1
  return (
    <g transform={`translate(0 ${float})`} strokeLinejoin="round">
      <path
        d={`M ${-r * 0.7} ${r * 0.3}
            Q ${-r * 0.75} ${-r * 0.95} 0 ${-r * 0.95}
            Q ${r * 0.75} ${-r * 0.95} ${r * 0.7} ${r * 0.3}
            L ${r * 0.9} ${r * 0.85 + w(1)}
            L ${r * 0.6} ${r * 0.62}
            L ${r * 0.42} ${r * 0.92 + w(2)}
            L ${r * 0.2} ${r * 0.6}
            L ${0} ${r * 0.95 + w(3)}
            L ${-r * 0.2} ${r * 0.6}
            L ${-r * 0.45} ${r * 0.9 + w(4)}
            L ${-r * 0.6} ${r * 0.62}
            L ${-r * 0.9} ${r * 0.85 + w(5)} Z`}
        fill="#D6D2E0"
        fillOpacity={0.82}
        stroke={INK}
        strokeWidth={1.2}
      />
      <path d={`M ${r * 0.15} ${-r * 0.9} Q ${r * 0.72} ${-r * 0.8} ${r * 0.7} ${r * 0.3} L ${r * 0.85} ${r * 0.8} L ${r * 0.3} ${r * 0.55} Z`} fill="#4A4A6E" opacity={0.35} />
      <path d={hatch(r * 0.25, -r * 0.4, 6, r * 0.7, r * 0.08, Math.PI / 2.2)} stroke={INK} strokeWidth={0.5} opacity={0.35} />
      {/* hood shadow */}
      <path d={`M ${-r * 0.5} ${-r * 0.1} Q ${-r * 0.5} ${-r * 0.75} ${-r * 0.05} ${-r * 0.78} Q ${r * 0.4} ${-r * 0.75} ${r * 0.4} ${-r * 0.1} Q ${-r * 0.05} ${r * 0.1} ${-r * 0.5} ${-r * 0.1} Z`} fill="#1A2B4D" stroke={INK} strokeWidth={0.8} />
      <GlowEye x={-r * 0.25} y={-r * 0.38} r={r * 0.09} />
      <GlowEye x={r * 0.1} y={-r * 0.38} r={r * 0.09} />
      {/* chains */}
      <path d={`M ${-r * 0.55} ${r * 0.2} Q ${-r * 0.1} ${r * 0.45} ${r * 0.5} ${r * 0.2}`} fill="none" stroke={GOLD} strokeWidth={1.4} strokeDasharray="3 2" />
    </g>
  )
}

/** Golem: dressed stone with a glowing rune. */
function Golem({ r, t }: { r: number; t: number }) {
  const glow = 0.6 + Math.sin(t / 400) * 0.4
  const stone = '#8E8A80'
  const shade = '#6E6A62'
  return (
    <g strokeLinejoin="round">
      {/* arms */}
      <rect x={-r * 1.0} y={-r * 0.25} width={r * 0.35} height={r * 0.9} rx={r * 0.05} fill={shade} stroke={INK} strokeWidth={1.2} />
      <rect x={r * 0.65} y={-r * 0.25} width={r * 0.35} height={r * 0.9} rx={r * 0.05} fill={shade} stroke={INK} strokeWidth={1.2} />
      <path d={`M ${-r} ${r * 0.1} h ${r * 0.35} M ${-r} ${r * 0.4} h ${r * 0.35} M ${r * 0.65} ${r * 0.1} h ${r * 0.35} M ${r * 0.65} ${r * 0.4} h ${r * 0.35}`} stroke={INK} strokeWidth={0.8} />
      {/* body */}
      <rect x={-r * 0.65} y={-r * 0.45} width={r * 1.3} height={r * 1.25} rx={r * 0.06} fill={stone} stroke={INK} strokeWidth={1.4} />
      <rect x={r * 0.25} y={-r * 0.45} width={r * 0.4} height={r * 1.25} fill={INK} opacity={0.18} />
      <path d={hatch(r * 0.28, -r * 0.4, 5, r * 0.3, r * 0.08, Math.PI / 2.6)} stroke={INK} strokeWidth={0.5} opacity={0.4} />
      <path
        d={`M ${-r * 0.65} ${r * 0.15} H ${r * 0.65} M ${-r * 0.65} ${r * 0.5} H ${r * 0.65} M 0 ${r * 0.15} V ${r * 0.5} M ${-r * 0.3} ${r * 0.5} V ${r * 0.8} M ${r * 0.3} ${r * 0.5} V ${r * 0.8} M ${-r * 0.2} ${-r * 0.45} V ${r * 0.15}`}
        stroke={INK}
        strokeWidth={1}
      />
      {/* head */}
      <rect x={-r * 0.4} y={-r * 0.95} width={r * 0.8} height={r * 0.55} rx={r * 0.05} fill="#9E9A90" stroke={INK} strokeWidth={1.4} />
      <rect x={-r * 0.3} y={-r * 0.75} width={r * 0.18} height={r * 0.1} fill={CYAN} opacity={glow} stroke={INK} strokeWidth={0.5} />
      <rect x={r * 0.04} y={-r * 0.75} width={r * 0.18} height={r * 0.1} fill={CYAN} opacity={glow} stroke={INK} strokeWidth={0.5} />
      {/* rune circle */}
      <circle cx={0} cy={-r * 0.12} r={r * 0.2} fill="none" stroke={CYAN} strokeWidth={1} opacity={glow} />
      <path
        d={`M ${-r * 0.12} ${-r * 0.22} L 0 ${-r * 0.05} L ${r * 0.12} ${-r * 0.22} M 0 ${-r * 0.05} L 0 ${r * 0.02}`}
        stroke={CYAN}
        strokeWidth={1.8}
        fill="none"
        opacity={glow}
      />
    </g>
  )
}

/** Dragon: crimson scales, a ribbed bone belly and a breath that loops time. */
function Dragon({ r, t }: { r: number; t: number }) {
  const flap = Math.sin(t / 220)
  const scale = '#8E1F30'
  const scaleLit = '#B3263E'
  const belly = '#D9C9A3'
  return (
    <g strokeLinejoin="round">
      {/* tail */}
      <path d={`M ${r * 0.5} ${r * 0.2} Q ${r * 1.1} ${r * 0.1} ${r * 1.05} ${-r * 0.35}`} stroke={INK} strokeWidth={r * 0.2} fill="none" strokeLinecap="round" />
      <path d={`M ${r * 0.5} ${r * 0.2} Q ${r * 1.1} ${r * 0.1} ${r * 1.05} ${-r * 0.35}`} stroke={scale} strokeWidth={r * 0.15} fill="none" strokeLinecap="round" />
      <path d={`M ${r * 1.05} ${-r * 0.58} L ${r * 0.9} ${-r * 0.3} L ${r * 1.2} ${-r * 0.3} Z`} fill={GOLD} stroke={INK} strokeWidth={0.8} />
      {/* wing: membrane between finger bones */}
      <path
        d={`M ${-r * 0.1} ${-r * 0.2} L ${r * 0.35} ${-r * (0.95 + flap * 0.25)} L ${r * 0.75} ${-r * (0.55 + flap * 0.15)} L ${r * 0.45} ${-r * 0.1} Z`}
        fill="#5A1420"
        stroke={INK}
        strokeWidth={1.2}
      />
      <path
        d={`M ${-r * 0.05} ${-r * 0.2} L ${r * 0.35} ${-r * (0.95 + flap * 0.25)} M ${r * 0.1} ${-r * 0.17} L ${r * 0.55} ${-r * (0.75 + flap * 0.2)} M ${r * 0.25} ${-r * 0.14} L ${r * 0.75} ${-r * (0.55 + flap * 0.15)}`}
        stroke={GOLD}
        strokeWidth={0.9}
        opacity={0.8}
      />
      {/* body */}
      <ellipse cx={r * 0.15} cy={r * 0.15} rx={r * 0.6} ry={r * 0.42} fill={scale} stroke={INK} strokeWidth={1.4} />
      <ellipse cx={r * 0.02} cy={r * 0.02} rx={r * 0.35} ry={r * 0.2} fill={scaleLit} opacity={0.7} />
      <path d={hatch(r * 0.35, -r * 0.18, 5, r * 0.35, r * 0.08, Math.PI / 2.4)} stroke={INK} strokeWidth={0.5} opacity={0.45} />
      <ellipse cx={r * 0.15} cy={r * 0.32} rx={r * 0.4} ry={r * 0.17} fill={belly} stroke={INK} strokeWidth={0.8} />
      <path d={`M ${-r * 0.1} ${r * 0.2} v ${r * 0.25} M ${r * 0.05} ${r * 0.17} v ${r * 0.31} M ${r * 0.2} ${r * 0.16} v ${r * 0.32} M ${r * 0.35} ${r * 0.18} v ${r * 0.28}`} stroke="#8A6A2A" strokeWidth={0.6} />
      {/* legs with claws */}
      {[-r * 0.2, r * 0.35].map((lx) => (
        <g key={lx}>
          <rect x={lx} y={r * 0.45} width={r * 0.18} height={r * 0.3} rx={r * 0.04} fill={scale} stroke={INK} strokeWidth={1} />
          <path d={`M ${lx} ${r * 0.75} l ${-r * 0.04} ${r * 0.06} M ${lx + r * 0.09} ${r * 0.75} l 0 ${r * 0.07} M ${lx + r * 0.18} ${r * 0.75} l ${r * 0.04} ${r * 0.06}`} stroke={BONE} strokeWidth={1.2} strokeLinecap="round" />
        </g>
      ))}
      {/* neck + head */}
      <path d={`M ${-r * 0.25} ${0} Q ${-r * 0.45} ${-r * 0.35} ${-r * 0.55} ${-r * 0.45}`} stroke={INK} strokeWidth={r * 0.32} fill="none" strokeLinecap="round" />
      <path d={`M ${-r * 0.25} ${0} Q ${-r * 0.45} ${-r * 0.35} ${-r * 0.55} ${-r * 0.45}`} stroke={scale} strokeWidth={r * 0.26} fill="none" strokeLinecap="round" />
      <path d={`M ${-r * 0.22} ${-r * 0.08} Q ${-r * 0.4} ${-r * 0.32} ${-r * 0.5} ${-r * 0.4}`} stroke={belly} strokeWidth={r * 0.06} fill="none" strokeDasharray="2 2" />
      <ellipse cx={-r * 0.7} cy={-r * 0.5} rx={r * 0.32} ry={r * 0.19} fill={scale} stroke={INK} strokeWidth={1.4} />
      <path d={`M ${-r * 0.98} ${-r * 0.44} Q ${-r * 0.75} ${-r * 0.38} ${-r * 0.5} ${-r * 0.42}`} fill="none" stroke={INK} strokeWidth={0.9} />
      {/* horns */}
      <path d={`M ${-r * 0.58} ${-r * 0.66} Q ${-r * 0.5} ${-r * 0.9} ${-r * 0.32} ${-r * 0.98} Q ${-r * 0.42} ${-r * 0.8} ${-r * 0.45} ${-r * 0.62} Z`} fill={BONE} stroke={INK} strokeWidth={0.8} />
      <GlowEye x={-r * 0.76} y={-r * 0.55} r={r * 0.06} color="#E3C47A" />
      {/* time-loop breath */}
      <circle cx={-r * 1.15} cy={-r * 0.45} r={r * (0.12 + Math.abs(flap) * 0.08)} fill="none" stroke={CYAN} strokeWidth={1.6} opacity={0.85} />
      <circle cx={-r * 1.15} cy={-r * 0.45} r={r * (0.2 + Math.abs(flap) * 0.08)} fill="none" stroke={CYAN} strokeWidth={0.7} strokeDasharray="2 3" opacity={0.6} />
    </g>
  )
}
