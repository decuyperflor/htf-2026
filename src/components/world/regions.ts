/**
 * World map artwork data. The map is 1000 x 600 SVG units. Region ids match
 * the `regions` table; location coordinates in the seed use the same space.
 */

export const MAP_W = 1000
export const MAP_H = 600

export type Pt = [number, number]

export type RegionArt = {
  regionId: string
  /** Outline (smoothed when drawn). */
  shape: Pt[]
  /** Where the name banner sits. */
  label: Pt
  fill: string
  /** Darker tone for outlines and details. */
  ink: string
}

export const CONTINENT: Pt[] = [
  [40, 120], [150, 40], [500, 28], [860, 40], [968, 140], [975, 400], [935, 585], [520, 594], [110, 590], [32, 470],
]

export const REGION_ART: RegionArt[] = [
  {
    regionId: 'forest',
    shape: [[60, 95], [200, 50], [395, 55], [425, 170], [385, 255], [300, 285], [150, 290], [55, 225]],
    label: [235, 82],
    fill: '#C9D3B4',
    ink: '#3F6B4E',
  },
  {
    regionId: 'peaks',
    shape: [[595, 58], [780, 45], [945, 85], [955, 235], [905, 295], [720, 305], [605, 255], [575, 150]],
    label: [770, 75],
    fill: '#D2CEDB',
    ink: '#4A4A6E',
  },
  {
    regionId: 'lake',
    shape: [[50, 240], [160, 290], [305, 292], [375, 350], [355, 470], [305, 570], [140, 575], [45, 480]],
    label: [215, 312],
    fill: '#C7DCD9',
    ink: '#1E6F7C',
  },
  {
    regionId: 'marsh',
    shape: [[345, 380], [440, 368], [565, 372], [645, 410], [655, 520], [565, 580], [420, 582], [325, 522], [325, 450]],
    label: [490, 398],
    fill: '#B6C1AC',
    ink: '#3C5345',
  },
  {
    regionId: 'desert',
    shape: [[630, 300], [760, 300], [910, 300], [960, 400], [945, 525], [865, 580], [700, 575], [650, 492], [640, 400]],
    label: [790, 318],
    fill: '#E8D9AE',
    ink: '#8A6A2A',
  },
  {
    regionId: 'city',
    shape: [[410, 205], [500, 180], [590, 205], [620, 290], [570, 362], [480, 372], [410, 345], [385, 270]],
    label: [500, 200],
    fill: '#F4EFE2',
    ink: '#8A6A2A',
  },
]

/** Smooth closed path through the midpoints of a polygon. */
export function smoothPath(points: Pt[]) {
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const n = points.length
  const start = mid(points[n - 1], points[0])
  let d = `M ${start[0]} ${start[1]}`
  for (let i = 0; i < n; i++) {
    const p = points[i]
    const m = mid(p, points[(i + 1) % n])
    d += ` Q ${p[0]} ${p[1]} ${m[0]} ${m[1]}`
  }
  return `${d} Z`
}

export function bounds(points: Pt[]) {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}

/** Point-in-polygon (ray casting), to keep decorations inside their region. */
export function inside([x, y]: Pt, poly: Pt[]) {
  let hit = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
  }
  return hit
}
