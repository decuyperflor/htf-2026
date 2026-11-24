/** Minimum SVG width; narrower screens scale the whole scene down instead. */
export const MIN_VIEW_WIDTH = 760
/** x of the dashed defense line in front of the soldiers. */
export const DEFENSE_LINE_X = 250

/** How long soldiers shoot at a FIXED glitch before it explodes. */
export const SHOOT_MS = 900
/** Total time from FIXED until the glitch is gone (shooting + explosion). */
export const DEATH_MS = 1900

/** Danger = number of echoes: 1 echo is small, 7+ echoes is huge. */
export function sizeFor(echoCount: number) {
  return 14 + 6 * Math.min(Math.max(echoCount, 1) - 1, 6)
}

/** Deterministic 0..1 value per (id, salt), so positions survive reloads. */
export function hash01(id: string, salt: number) {
  let h = 2166136261 ^ salt
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  h ^= h >>> 15
  return (h >>> 0) / 4294967295
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

export function easeOutBack(t: number) {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

export function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}
