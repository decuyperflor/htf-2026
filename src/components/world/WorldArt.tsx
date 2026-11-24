import { memo } from 'react'
import { hash01 } from '#/components/battlefield/geometry.ts'
import type { Location } from '#/lib/glitch.ts'
import { CONTINENT, MAP_H, MAP_W, REGION_ART, bounds, inside, smoothPath, type Pt } from './regions.ts'

const INK = '#2b2340'

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

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-1.5} y={2} width={3} height={6} fill="#8b5a2b" stroke={INK} strokeWidth={0.8} />
      <polygon points="0,-14 9,2 -9,2" fill="#4fae5a" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
      <polygon points="0,-20 6,-8 -6,-8" fill="#6cc66f" stroke={INK} strokeWidth={1.2} strokeLinejoin="round" />
    </g>
  )
}

function Mountain({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <polygon points="-26,10 0,-30 26,10" fill="#a996c9" stroke={INK} strokeWidth={1.4} strokeLinejoin="round" />
      <polygon points="0,-30 -9,-16 -3,-19 3,-14 9,-16" fill="#ffffff" stroke={INK} strokeWidth={1} strokeLinejoin="round" />
      <polygon points="0,-30 26,10 8,10" fill="#000" opacity={0.08} />
    </g>
  )
}

function Dune({ x, y }: { x: number; y: number }) {
  return <path d={`M ${x - 16} ${y} Q ${x} ${y - 9} ${x + 16} ${y}`} fill="none" stroke="#d9a94a" strokeWidth={2} strokeLinecap="round" />
}

function Cactus({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={1} fill="#6cbf6a" strokeLinejoin="round">
      <rect x={-2} y={-12} width={4} height={14} rx={2} />
      <path d="M -2 -5 h -4 v -5" fill="none" strokeWidth={3} stroke="#6cbf6a" strokeLinecap="round" />
      <path d="M 2 -7 h 4 v -4" fill="none" strokeWidth={3} stroke="#6cbf6a" strokeLinecap="round" />
    </g>
  )
}

function Reeds({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#3c5c45" strokeWidth={1.2} strokeLinecap="round">
      <line x1={x} y1={y} x2={x - 2} y2={y - 9} />
      <line x1={x + 2} y1={y} x2={x + 3} y2={y - 11} />
      <line x1={x + 4} y1={y} x2={x + 7} y2={y - 8} />
      <ellipse cx={x + 3} cy={y - 11} rx={1.2} ry={2.5} fill="#6b4a2b" stroke="none" />
    </g>
  )
}

function House({ x, y, roof = '#e35d5d' }: { x: number; y: number; roof?: string }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={1} strokeLinejoin="round">
      <rect x={-6} y={-6} width={12} height={9} fill="#fff4dc" />
      <polygon points="-8,-6 0,-13 8,-6" fill={roof} />
    </g>
  )
}

function Castle({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} stroke={INK} strokeWidth={1.4} strokeLinejoin="round">
      <rect x={-26} y={-18} width={52} height={30} fill="#efe3ff" />
      {[-26, 18].map((tx) => (
        <g key={tx}>
          <rect x={tx} y={-34} width={10} height={46} fill="#e4d6ff" />
          <polygon points={`${tx - 2},-34 ${tx + 5},-48 ${tx + 12},-34`} fill="#7a5cff" />
        </g>
      ))}
      <rect x={-8} y={-40} width={16} height={52} fill="#f4ecff" />
      <polygon points="-11,-40 0,-58 11,-40" fill="#7a5cff" />
      <line x1={0} y1={-58} x2={0} y2={-68} />
      <polygon points="0,-68 10,-65 0,-62" fill="#ffcf4d" />
      <path d="M -6 12 v -10 a 6 6 0 0 1 12 0 v 10 Z" fill="#6b4a2b" />
    </g>
  )
}

/** Everything on the map that never moves. Memoised: drawn once. */
export const WorldArt = memo(function WorldArt({ locations }: { locations: Location[] }) {
  const byRegion = (id: string) => locations.filter((l) => l.regionId === id)
  const art = Object.fromEntries(REGION_ART.map((r) => [r.regionId, r]))

  return (
    <g>
      {/* Sea */}
      <rect x={-2000} y={-2000} width={MAP_W + 4000} height={MAP_H + 4000} fill="#7cc8e8" />
      {Array.from({ length: 26 }, (_, i) => {
        const x = hash01('sea', i) * MAP_W
        const y = hash01('sea', i + 50) * MAP_H
        return <path key={i} d={`M ${x} ${y} q 6 -4 12 0 q 6 4 12 0`} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeWidth={1.5} />
      })}

      {/* Continent with shore */}
      <path d={smoothPath(CONTINENT)} fill="#5aa9c9" transform="translate(4 8)" opacity={0.6} />
      <path d={smoothPath(CONTINENT)} fill="#f3e6b8" stroke={INK} strokeWidth={3} />

      {/* Regions */}
      {REGION_ART.map((r) => (
        <path key={r.regionId} d={smoothPath(r.shape)} fill={r.fill} stroke={r.ink} strokeWidth={1.5} strokeDasharray="5 4" />
      ))}

      {/* Forest */}
      {scatter('forest', art.forest.shape, 34, byRegion('forest')).map(([x, y], i) => (
        <Tree key={i} x={x} y={y} s={0.8 + hash01('forest-s', i) * 0.5} />
      ))}
      <Tree x={180} y={118} s={2} />

      {/* Peaks */}
      {scatter('peaks', art.peaks.shape, 12, byRegion('peaks'), 7).map(([x, y], i) => (
        <Mountain key={i} x={x} y={y} s={0.7 + hash01('peaks-s', i) * 0.6} />
      ))}
      <g transform="translate(835 150)">
        <polygon points="-38,18 -10,-30 10,-30 38,18" fill="#8c6f8f" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
        <ellipse cx={0} cy={-30} rx={10} ry={3} fill="#ff6a3d" stroke={INK} strokeWidth={1} />
        <path d="M -10 -30 q 4 12 -2 22 M 6 -30 q -2 10 4 18" fill="none" stroke="#ff6a3d" strokeWidth={2.5} strokeLinecap="round" />
      </g>

      {/* Lake */}
      <path
        d={smoothPath([[120, 360], [200, 335], [300, 360], [320, 430], [280, 500], [190, 520], [110, 480], [90, 410]])}
        fill="#4fb3e8"
        stroke={INK}
        strokeWidth={1.8}
      />
      <ellipse cx={240} cy={432} rx={18} ry={9} fill="#9ad98f" stroke={INK} strokeWidth={1.2} />
      <Tree x={238} y={430} s={0.7} />
      <path d="M 140 352 l 18 14" stroke="#8b5a2b" strokeWidth={4} strokeLinecap="round" />
      <path d="M 140 352 l 18 14" stroke={INK} strokeWidth={0.8} strokeDasharray="2 3" />
      {scatter('lake', art.lake.shape, 10, byRegion('lake'), 3)
        .filter(([x, y]) => Math.hypot((x - 205) / 120, (y - 428) / 95) > 1)
        .map(([x, y], i) => (
          <Tree key={i} x={x} y={y} s={0.8} />
        ))}

      {/* Marsh */}
      {scatter('marsh', art.marsh.shape, 9, byRegion('marsh'), 11).map(([x, y], i) => (
        <ellipse key={`p${i}`} cx={x} cy={y} rx={14 + hash01('pool', i) * 10} ry={6} fill="#4f6f58" opacity={0.8} />
      ))}
      {scatter('marsh', art.marsh.shape, 16, byRegion('marsh'), 31).map(([x, y], i) => (
        <Reeds key={`r${i}`} x={x} y={y} />
      ))}
      <g transform="translate(420 418)" stroke={INK} strokeWidth={1} strokeLinejoin="round">
        <rect x={-7} y={-6} width={14} height={10} fill="#a58a6a" />
        <polygon points="-10,-6 0,-18 10,-6" fill="#8a5cff" />
      </g>
      <path d="M 455 530 h 50" stroke="#8b5a2b" strokeWidth={5} />
      <path d="M 455 530 h 50" stroke={INK} strokeWidth={1} strokeDasharray="3 3" />

      {/* Desert */}
      {scatter('desert', art.desert.shape, 18, byRegion('desert'), 5).map(([x, y], i) =>
        i % 4 === 0 ? <Cactus key={i} x={x} y={y} /> : <Dune key={i} x={x} y={y} />,
      )}
      <g transform="translate(850 408)" stroke={INK} strokeWidth={1.4} strokeLinejoin="round">
        <polygon points="-28,14 0,-22 28,14" fill="#e8c46e" />
        <polygon points="0,-22 28,14 10,14" fill="#000" opacity={0.1} stroke="none" />
        <rect x={-4} y={4} width={8} height={10} fill="#6b4a2b" />
      </g>
      <ellipse cx={720} cy={362} rx={16} ry={7} fill="#4fb3e8" stroke={INK} strokeWidth={1.2} />
      <g transform="translate(735 352)" stroke={INK} strokeWidth={1}>
        <path d="M 0 0 q 1 -10 -1 -16" fill="none" stroke="#8b5a2b" strokeWidth={2.5} />
        <path d="M -1 -16 q -8 -2 -12 4 M -1 -16 q 8 -3 12 3 M -1 -16 q -3 -7 -9 -8 M -1 -16 q 4 -7 10 -7" fill="none" stroke="#4fae5a" strokeWidth={2.5} strokeLinecap="round" />
      </g>

      {/* City */}
      <path d={smoothPath([[430, 225], [500, 205], [570, 225], [595, 290], [560, 345], [440, 345], [405, 290]])} fill="#e9dcbd" stroke={INK} strokeWidth={1.6} strokeDasharray="2 2" />
      {[[440, 300], [455, 255], [560, 260], [568, 310], [470, 320], [530, 322]].map(([x, y], i) => (
        <House key={i} x={x} y={y} roof={i % 2 ? '#e35d5d' : '#5d8de3'} />
      ))}
      <Castle x={500} y={285} />
    </g>
  )
})

/** Animated bits: water ripples, volcano glow and smoke, swamp mist, drifting clouds. */
export function WorldFx({ now, cloudOpacity }: { now: number; cloudOpacity: number }) {
  const t = now / 1000
  return (
    <g pointerEvents="none">
      {/* Lake ripples */}
      {[0, 1, 2].map((i) => {
        const k = (t * 0.4 + i / 3) % 1
        return <ellipse key={i} cx={190} cy={470} rx={6 + k * 24} ry={2 + k * 8} fill="none" stroke="#fff" strokeWidth={1.2} opacity={(1 - k) * 0.8} />
      })}
      {/* Volcano */}
      <circle cx={835} cy={120} r={9 + Math.sin(t * 3) * 2} fill="#ff6a3d" opacity={0.35 + Math.sin(t * 3) * 0.15} />
      {[0, 1, 2].map((i) => {
        const k = (t * 0.25 + i / 3) % 1
        return <circle key={i} cx={835 + Math.sin(k * 6 + i) * 6} cy={112 - k * 50} r={4 + k * 8} fill="#7b6f80" opacity={(1 - k) * 0.5} />
      })}
      {/* Swamp mist */}
      {[0, 1, 2, 3].map((i) => (
        <ellipse key={i} cx={400 + i * 60 + Math.sin(t * 0.5 + i) * 18} cy={470 + (i % 2) * 40} rx={40} ry={9} fill="#d8e8dc" opacity={0.25} />
      ))}
      {/* Clouds */}
      <g opacity={cloudOpacity}>
        {[0, 1, 2, 3].map((i) => {
          const speed = 8 + i * 3
          const x = ((t * speed + i * 290) % (MAP_W + 300)) - 150
          const y = 60 + i * 130
          return (
            <g key={i} transform={`translate(${x} ${y})`} fill="#ffffff" stroke={INK} strokeWidth={1.2} opacity={0.85}>
              <ellipse cx={0} cy={0} rx={34} ry={13} />
              <ellipse cx={-18} cy={-6} rx={16} ry={12} />
              <ellipse cx={12} cy={-10} rx={20} ry={15} />
            </g>
          )
        })}
      </g>
    </g>
  )
}

/** Region name banners, with a red badge for the number of monsters at large. */
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
        const w = name.length * 7.2 + 20
        const [x, y] = r.label
        const n = counts[r.regionId] ?? 0
        return (
          <g key={r.regionId} transform={`translate(${x} ${y})`}>
            <rect x={-w / 2} y={-11} width={w} height={20} rx={10} fill="#fffaf0" stroke={INK} strokeWidth={1.8} />
            <text textAnchor="middle" y={4} fontSize={12} fontWeight={700} fill={INK} letterSpacing={0.5}>
              {name}
            </text>
            {n > 0 && (
              <g transform={`translate(${w / 2} -10)`}>
                <circle r={9} fill="#ff3b5c" stroke={INK} strokeWidth={1.5} />
                <text textAnchor="middle" y={4} fontSize={11} fontWeight={700} fill="#fff">
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
