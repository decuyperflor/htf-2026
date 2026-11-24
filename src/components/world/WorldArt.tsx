import { memo } from 'react'
import { hash01 } from '#/components/battlefield/geometry.ts'
import type { Location } from '#/lib/glitch.ts'
import { CONTINENT, MAP_H, MAP_W, REGION_ART, bounds, inside, smoothPath, type Pt } from './regions.ts'

/*
 * The world map as an engraved chart, in the colours of the Guardians shield:
 * night-navy sea under the cyan ley-line grid, bone land with gold coastlines,
 * muted region tints, hatched shading and fine ink outlines.
 */
const INK = '#101D38'
const NAVY_DEEP = '#0A1328'
const GOLD = '#C9A24B'
const GOLD_LIGHT = '#E3C47A'
const BONE = '#E9E2CF'
const PAPER = '#F4EFE2'
const CRIMSON = '#B3263E'
const CYAN = '#39C3D6'
const PINE = '#2F4A3A'
const MOSS = '#3F6B4E'
const WATER = '#1A2B4D'
const DISPLAY = 'Cinzel, Georgia, serif'

/** Deterministic points inside a region, away from its locations. */
function scatter(regionId: string, poly: Pt[], count: number, avoid: Location[], seed = 0) {
  const b = bounds(poly)
  const out: Pt[] = []
  for (let i = 0; out.length < count && i < count * 12; i++) {
    const p: Pt = [b.x + hash01(regionId, seed + i * 2) * b.w, b.y + hash01(regionId, seed + i * 2 + 1) * b.h]
    if (!inside(p, poly)) continue
    if (avoid.some((l) => Math.hypot(l.x - p[0], l.y - p[1]) < 30)) continue
    if (out.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 16)) continue
    out.push(p)
  }
  return out.sort((a, b) => a[1] - b[1])
}

/** A conifer drawn like an engraving: dark body, a lit side and branch strokes. */
function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <line x1={0} y1={2} x2={0} y2={8} stroke={INK} strokeWidth={1.6} />
      <path d="M 0 -20 L 8 2 L -8 2 Z" fill={PINE} stroke={INK} strokeWidth={0.8} />
      <path d="M 0 -20 L -8 2 L -1 2 Z" fill={MOSS} />
      <path d="M -5 -4 L 0 -8 L 5 -4 M -6.5 -0.5 L 0 -4 L 6.5 -0.5 M -3.5 -9 L 0 -12 L 3.5 -9" fill="none" stroke={INK} strokeWidth={0.6} opacity={0.7} />
    </g>
  )
}

/** A peak with a snow cap and hatched shadow side. */
function Mountain({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <path d="M -26 10 L 0 -30 L 26 10 Z" fill="#DAD3C0" stroke={INK} strokeWidth={1} />
      <path d="M 0 -30 L 26 10 L 6 10 Z" fill="#B9B2A3" />
      <path d="M 4 -16 L 9 -8 M 7 -10 L 14 0 M 10 -4 L 17 6 M 13 2 L 18 9 M 3 -6 L 8 4" stroke={INK} strokeWidth={0.5} opacity={0.6} />
      <path d="M 0 -30 L -9 -16 L -3 -19 L 3 -14 L 9 -16 Z" fill={PAPER} stroke={INK} strokeWidth={0.8} />
      <path d="M 0 -30 L 26 10" fill="none" stroke={INK} strokeWidth={1} />
    </g>
  )
}

function Dune({ x, y }: { x: number; y: number }) {
  return (
    <g fill="none" strokeLinecap="round">
      <path d={`M ${x - 16} ${y} Q ${x} ${y - 9} ${x + 16} ${y}`} stroke="#8A6A2A" strokeWidth={1.2} />
      <path d={`M ${x - 9} ${y + 3} Q ${x + 2} ${y - 2} ${x + 12} ${y + 3}`} stroke="#8A6A2A" strokeWidth={0.6} opacity={0.6} />
    </g>
  )
}

function Cactus({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={0.8} fill={MOSS} strokeLinejoin="round">
      <rect x={-2} y={-12} width={4} height={14} rx={2} />
      <path d="M -2 -5 h -4 v -5" fill="none" strokeWidth={2.4} stroke={MOSS} strokeLinecap="round" />
      <path d="M 2 -7 h 4 v -4" fill="none" strokeWidth={2.4} stroke={MOSS} strokeLinecap="round" />
    </g>
  )
}

function Reeds({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#3C5345" strokeWidth={0.9} strokeLinecap="round">
      <line x1={x} y1={y} x2={x - 2} y2={y - 9} />
      <line x1={x + 2} y1={y} x2={x + 3} y2={y - 11} />
      <line x1={x + 4} y1={y} x2={x + 7} y2={y - 8} />
      <ellipse cx={x + 3} cy={y - 11} rx={1.1} ry={2.4} fill={INK} stroke="none" />
    </g>
  )
}

function House({ x, y, roof = CRIMSON }: { x: number; y: number; roof?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={0.8} strokeLinejoin="round">
      <rect x={-6} y={-6} width={12} height={9} fill={PAPER} />
      <path d="M -6 -2 H 6 M -6 1 H 6" stroke="#B9AD8C" strokeWidth={0.4} />
      <polygon points="-8,-6 0,-13 8,-6" fill={roof} />
      <rect x={-1.5} y={-1} width={3} height={4} fill={INK} stroke="none" />
    </g>
  )
}

/** The guild castle, as on the shield: bone stone, crimson roofs, a gold pennant. */
function Castle({ x, y }: { x: number; y: number }) {
  const courses = (x0: number, y0: number, w: number, h: number) =>
    Array.from({ length: Math.floor(h / 5) }, (_, i) => `M ${x0} ${y0 + 5 + i * 5} h ${w}`).join(' ')
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={1} strokeLinejoin="round">
      <rect x={-26} y={-18} width={52} height={30} fill={BONE} />
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x={-26 + i * 9.4} y={-22} width={5} height={4} fill={BONE} />
      ))}
      {[-26, 16].map((tx) => (
        <g key={tx}>
          <rect x={tx} y={-34} width={10} height={46} fill={BONE} />
          <path d={courses(tx, -34, 10, 46)} stroke="#B9AD8C" strokeWidth={0.4} />
          <polygon points={`${tx - 2},-34 ${tx + 5},-48 ${tx + 12},-34`} fill={CRIMSON} />
        </g>
      ))}
      <rect x={-8} y={-40} width={16} height={52} fill={PAPER} />
      <path d={courses(-8, -40, 16, 52)} stroke="#B9AD8C" strokeWidth={0.4} />
      <polygon points="-11,-40 0,-58 11,-40" fill={CRIMSON} />
      <line x1={0} y1={-58} x2={0} y2={-68} />
      <polygon points="0,-68 10,-65 0,-62" fill={GOLD} />
      <path d="M -2 -30 v -5 a 2 2 0 0 1 4 0 v 5 Z" fill={INK} />
      <path d="M -6 12 v -10 a 6 6 0 0 1 12 0 v 10 Z" fill={INK} />
      <path d="M -3 12 v -11 M 0 12 v -12 M 3 12 v -11 M -6 6 h 12" stroke={GOLD} strokeWidth={0.6} />
    </g>
  )
}

/** Compass rose in the corner of the chart. */
function CompassRose({ x, y, r }: { x: number; y: number; r: number }) {
  const point = (a: number, len: number, w: number) => {
    const c = Math.cos(a)
    const s = Math.sin(a)
    return `M 0 0 L ${-s * w} ${c * w} L ${c * len} ${s * len} L ${s * w} ${-c * w} Z`
  }
  return (
    <g transform={`translate(${x} ${y})`} strokeLinejoin="round">
      <circle r={r} fill={NAVY_DEEP} stroke={GOLD} strokeWidth={1.2} />
      <circle r={r * 0.82} fill="none" stroke={GOLD} strokeWidth={0.5} strokeDasharray="1.5 2" />
      {[0, 1, 2, 3].map((i) => (
        <path key={`d${i}`} d={point(Math.PI / 4 + (i * Math.PI) / 2, r * 0.55, r * 0.12)} fill={BONE} stroke={INK} strokeWidth={0.5} />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <path key={`c${i}`} d={point(-Math.PI / 2 + (i * Math.PI) / 2, r * 0.92, r * 0.16)} fill={i === 0 ? CRIMSON : GOLD} stroke={INK} strokeWidth={0.6} />
      ))}
      <circle r={r * 0.08} fill={GOLD_LIGHT} stroke={INK} strokeWidth={0.5} />
      <text y={-r - 4} textAnchor="middle" fontSize={r * 0.42} fontWeight={700} fill={GOLD_LIGHT} fontFamily={DISPLAY}>
        N
      </text>
    </g>
  )
}

/** Everything on the map that never moves. Memoised: drawn once. */
export const WorldArt = memo(function WorldArt({ locations }: { locations: Location[] }) {
  const byRegion = (id: string) => locations.filter((l) => l.regionId === id)
  const art = Object.fromEntries(REGION_ART.map((r) => [r.regionId, r]))
  const continent = smoothPath(CONTINENT)
  const lake = smoothPath([[120, 360], [200, 335], [300, 360], [320, 430], [280, 500], [190, 520], [110, 480], [90, 410]])

  return (
    <g>
      <defs>
        <pattern id="chart-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke={INK} strokeWidth="0.5" />
        </pattern>
        <clipPath id="chart-land">
          <path d={continent} />
        </clipPath>
      </defs>

      {/* Sea: night-navy under the ley-line grid */}
      <rect x={-2000} y={-2000} width={MAP_W + 4000} height={MAP_H + 4000} fill={INK} />
      <g stroke={CYAN} fill="none">
        <path
          d={Array.from({ length: 21 }, (_, i) => `M ${i * 50} -2000 V ${MAP_H + 2000}`).join(' ') + ' ' + Array.from({ length: 13 }, (_, i) => `M -2000 ${i * 50} H ${MAP_W + 2000}`).join(' ')}
          strokeWidth={0.6}
          opacity={0.14}
        />
        <path
          d={Array.from({ length: 5 }, (_, i) => `M ${i * 250} -2000 V ${MAP_H + 2000}`).join(' ') + ' ' + Array.from({ length: 3 }, (_, i) => `M -2000 ${i * 300} H ${MAP_W + 2000}`).join(' ')}
          strokeWidth={1}
          opacity={0.22}
        />
      </g>
      {Array.from({ length: 30 }, (_, i) => {
        const x = hash01('sea', i) * MAP_W
        const y = hash01('sea', i + 50) * MAP_H
        return <path key={i} d={`M ${x} ${y} q 5 -3 10 0 q 5 3 10 0 q 5 -3 10 0`} fill="none" stroke={CYAN} strokeOpacity={0.35} strokeWidth={0.8} />
      })}

      {/* Continent: shore contour lines, bone land, ink coast with a gold inner line */}
      <path d={continent} fill="none" stroke={CYAN} strokeWidth={26} opacity={0.08} />
      <path d={continent} fill="none" stroke={CYAN} strokeWidth={14} opacity={0.14} />
      <path d={continent} fill="none" stroke={CYAN} strokeWidth={6} opacity={0.25} />
      <path d={continent} fill={BONE} stroke={INK} strokeWidth={2.6} />

      {/* Regions, with a fine hatch over the land */}
      {REGION_ART.map((r) => (
        <path key={r.regionId} d={smoothPath(r.shape)} fill={r.fill} stroke={r.ink} strokeWidth={1} strokeDasharray="6 3 1 3" />
      ))}
      <rect x={0} y={0} width={MAP_W} height={MAP_H} fill="url(#chart-hatch)" opacity={0.07} clipPath="url(#chart-land)" />
      <path d={continent} fill="none" stroke={GOLD} strokeWidth={1} transform="translate(0 0)" opacity={0.9} clipPath="url(#chart-land)" />

      {/* Forest */}
      {scatter('forest', art.forest.shape, 38, byRegion('forest')).map(([x, y], i) => (
        <Tree key={i} x={x} y={y} s={0.8 + hash01('forest-s', i) * 0.5} />
      ))}
      <Tree x={180} y={118} s={1.9} />

      {/* Peaks, with the fire mountain */}
      {scatter('peaks', art.peaks.shape, 13, byRegion('peaks'), 7).map(([x, y], i) => (
        <Mountain key={i} x={x} y={y} s={0.7 + hash01('peaks-s', i) * 0.6} />
      ))}
      <g transform="translate(835 150)" strokeLinejoin="round">
        <path d="M -38 18 L -10 -30 L 10 -30 L 38 18 Z" fill="#8E8698" stroke={INK} strokeWidth={1.2} />
        <path d="M 10 -30 L 38 18 L 14 18 Z" fill="#6E6577" />
        <path d="M 14 -18 L 22 -4 M 18 -12 L 28 6 M 20 -2 L 30 14" stroke={INK} strokeWidth={0.5} opacity={0.6} />
        <ellipse cx={0} cy={-30} rx={10} ry={3} fill={CRIMSON} stroke={INK} strokeWidth={0.8} />
        <path d="M -10 -30 q 4 12 -2 22 M 6 -30 q -2 10 4 18" fill="none" stroke={CRIMSON} strokeWidth={2} strokeLinecap="round" />
      </g>

      {/* Mirror lake: deep water with depth contours */}
      <path d={lake} fill={WATER} stroke={INK} strokeWidth={1.6} />
      <path d={lake} fill="none" stroke={CYAN} strokeWidth={1} opacity={0.5} transform="translate(205 428) scale(0.82) translate(-205 -428)" />
      <path d={lake} fill="none" stroke={CYAN} strokeWidth={0.8} opacity={0.3} transform="translate(205 428) scale(0.62) translate(-205 -428)" />
      <ellipse cx={240} cy={432} rx={18} ry={9} fill="#C9D3B4" stroke={INK} strokeWidth={1} />
      <Tree x={238} y={430} s={0.7} />
      <path d="M 140 352 l 18 14" stroke="#6B5A3A" strokeWidth={4} strokeLinecap="round" />
      <path d="M 140 352 l 18 14" stroke={INK} strokeWidth={0.6} strokeDasharray="2 2" />
      {scatter('lake', art.lake.shape, 10, byRegion('lake'), 3)
        .filter(([x, y]) => Math.hypot((x - 205) / 120, (y - 428) / 95) > 1)
        .map(([x, y], i) => (
          <Tree key={i} x={x} y={y} s={0.8} />
        ))}

      {/* Gloom marsh */}
      {scatter('marsh', art.marsh.shape, 9, byRegion('marsh'), 11).map(([x, y], i) => (
        <g key={`p${i}`}>
          <ellipse cx={x} cy={y} rx={14 + hash01('pool', i) * 10} ry={6} fill="#5C6E63" stroke={INK} strokeWidth={0.5} opacity={0.85} />
          <path d={`M ${x - 6} ${y} h 12`} stroke={CYAN} strokeWidth={0.5} opacity={0.5} />
        </g>
      ))}
      {scatter('marsh', art.marsh.shape, 18, byRegion('marsh'), 31).map(([x, y], i) => (
        <Reeds key={`r${i}`} x={x} y={y} />
      ))}
      <g transform="translate(420 418)" stroke={INK} strokeWidth={0.8} strokeLinejoin="round">
        <rect x={-7} y={-6} width={14} height={10} fill="#B9AD8C" />
        <polygon points="-10,-6 0,-18 10,-6" fill="#4A4A6E" />
        <rect x={-1.5} y={-1} width={3} height={5} fill={INK} stroke="none" />
      </g>
      <path d="M 455 530 h 50" stroke="#6B5A3A" strokeWidth={4} />
      <path d="M 455 530 h 50" stroke={INK} strokeWidth={0.6} strokeDasharray="2 2" />

      {/* Sunscar desert */}
      {scatter('desert', art.desert.shape, 20, byRegion('desert'), 5).map(([x, y], i) =>
        i % 4 === 0 ? <Cactus key={i} x={x} y={y} /> : <Dune key={i} x={x} y={y} />,
      )}
      <g transform="translate(850 408)" stroke={INK} strokeWidth={1} strokeLinejoin="round">
        <polygon points="-28,14 0,-22 28,14" fill="#D9C48A" />
        <polygon points="0,-22 28,14 10,14" fill="#B39A5C" stroke="none" />
        <path d="M -20 4 H 20 M -13 -5 H 13 M -6 -14 H 6" stroke="#8A6A2A" strokeWidth={0.5} />
        <rect x={-4} y={4} width={8} height={10} fill={INK} />
      </g>
      <ellipse cx={720} cy={362} rx={16} ry={7} fill={WATER} stroke={INK} strokeWidth={1} />
      <g transform="translate(735 352)" stroke={INK} strokeWidth={1}>
        <path d="M 0 0 q 1 -10 -1 -16" fill="none" stroke="#6B5A3A" strokeWidth={2} />
        <path d="M -1 -16 q -8 -2 -12 4 M -1 -16 q 8 -3 12 3 M -1 -16 q -3 -7 -9 -8 M -1 -16 q 4 -7 10 -7" fill="none" stroke={MOSS} strokeWidth={2} strokeLinecap="round" />
      </g>

      {/* Achrona city: a walled plaza */}
      <path d={smoothPath([[430, 225], [500, 205], [570, 225], [595, 290], [560, 345], [440, 345], [405, 290]])} fill={PAPER} stroke={INK} strokeWidth={1.2} />
      <path d={smoothPath([[430, 225], [500, 205], [570, 225], [595, 290], [560, 345], [440, 345], [405, 290]])} fill="none" stroke={GOLD} strokeWidth={2.5} strokeDasharray="1 4" strokeLinecap="round" />
      {[[440, 300], [455, 255], [560, 260], [568, 310], [470, 320], [530, 322]].map(([x, y], i) => (
        <House key={i} x={x} y={y} roof={i % 2 ? CRIMSON : '#2B5C8A'} />
      ))}
      <Castle x={500} y={285} />

      {/* Chart furniture: compass rose and a gold border with a degree scale */}
      <CompassRose x={50} y={52} r={26} />
      <rect x={4} y={4} width={MAP_W - 8} height={MAP_H - 8} fill="none" stroke={GOLD} strokeWidth={1.2} />
      <rect x={9} y={9} width={MAP_W - 18} height={MAP_H - 18} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.7} />
      <path
        d={
          Array.from({ length: 41 }, (_, i) => `M ${9 + i * ((MAP_W - 18) / 40)} 4 v ${i % 5 ? 3 : 5}`).join(' ') +
          ' ' +
          Array.from({ length: 41 }, (_, i) => `M ${9 + i * ((MAP_W - 18) / 40)} ${MAP_H - 4} v ${i % 5 ? -3 : -5}`).join(' ') +
          ' ' +
          Array.from({ length: 25 }, (_, i) => `M 4 ${9 + i * ((MAP_H - 18) / 24)} h ${i % 5 ? 3 : 5}`).join(' ') +
          ' ' +
          Array.from({ length: 25 }, (_, i) => `M ${MAP_W - 4} ${9 + i * ((MAP_H - 18) / 24)} h ${i % 5 ? -3 : -5}`).join(' ')
        }
        stroke={GOLD}
        strokeWidth={0.6}
      />
    </g>
  )
})

/** Animated bits: water ripples, fire-mountain glow and smoke, marsh mist, drifting clouds. */
export function WorldFx({ now, cloudOpacity }: { now: number; cloudOpacity: number }) {
  const t = now / 1000
  return (
    <g pointerEvents="none">
      {/* Lake ripples */}
      {[0, 1, 2].map((i) => {
        const k = (t * 0.4 + i / 3) % 1
        return <ellipse key={i} cx={190} cy={470} rx={6 + k * 24} ry={2 + k * 8} fill="none" stroke={CYAN} strokeWidth={0.8} opacity={(1 - k) * 0.7} />
      })}
      {/* Fire mountain */}
      <circle cx={835} cy={120} r={9 + Math.sin(t * 3) * 2} fill={CRIMSON} opacity={0.3 + Math.sin(t * 3) * 0.12} />
      {[0, 1, 2].map((i) => {
        const k = (t * 0.25 + i / 3) % 1
        return <circle key={i} cx={835 + Math.sin(k * 6 + i) * 6} cy={112 - k * 50} r={4 + k * 8} fill="#6E6577" opacity={(1 - k) * 0.45} />
      })}
      {/* Marsh mist */}
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={400 + i * 60 + Math.sin(t * 0.5 + i) * 18} cy={470 + (i % 2) * 40} rx={40} ry={9} fill={PAPER} opacity={0.22} />
      ))}
      {/* Clouds: engraved, with a few contour strokes */}
      <g opacity={cloudOpacity}>
        {[0, 1, 2, 3].map((i) => {
          const speed = 8 + i * 3
          const x = ((t * speed + i * 290) % (MAP_W + 300)) - 150
          const y = 60 + i * 130
          return (
            <g key={i} transform={`translate(${x} ${y})`} opacity={0.8}>
              <g fill={PAPER} stroke={INK} strokeWidth={0.8}>
                <ellipse cx={0} cy={0} rx={34} ry={12} />
                <ellipse cx={-18} cy={-6} rx={16} ry={11} />
                <ellipse cx={12} cy={-10} rx={20} ry={14} />
              </g>
              <path d="M -26 4 q 12 4 24 0 M 4 2 q 10 3 20 -1" fill="none" stroke={INK} strokeWidth={0.5} opacity={0.5} />
            </g>
          )
        })}
      </g>
    </g>
  )
}

/** Region name plates (navy, gold-rimmed), with a crimson badge for the number of monsters at large. */
export function RegionLabels({
  names,
  counts,
  opacity,
}: {
  names: Record<string, string>
  counts: Record<string, number>
  opacity: number
}) {
  if (opacity <= 0.01) return null
  return (
    <g opacity={opacity} pointerEvents="none">
      {REGION_ART.map((r) => {
        const name = names[r.regionId] ?? r.regionId
        const w = name.length * 8.2 + 26
        const [x, y] = r.label
        const n = counts[r.regionId] ?? 0
        return (
          <g key={r.regionId} transform={`translate(${x} ${y})`}>
            <rect x={-w / 2} y={-11} width={w} height={21} rx={2} fill={INK} stroke={GOLD} strokeWidth={1.4} />
            <rect x={-w / 2 + 3} y={-8} width={w - 6} height={15} rx={1} fill="none" stroke={GOLD} strokeWidth={0.5} opacity={0.6} />
            <text textAnchor="middle" y={4} fontSize={11} fontWeight={700} fill={BONE} letterSpacing={1.2} fontFamily={DISPLAY}>
              {name.toUpperCase()}
            </text>
            {n > 0 && (
              <g transform={`translate(${w / 2} -10)`}>
                <circle r={9} fill={CRIMSON} stroke={GOLD} strokeWidth={1.5} />
                <text textAnchor="middle" y={4} fontSize={11} fontWeight={700} fill={PAPER} fontFamily={DISPLAY}>
                  {n}
                </text>
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}
