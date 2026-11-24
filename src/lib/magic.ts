import type { GlitchListItem } from '#/lib/glitch.ts'

/**
 * How much magic Achrona still has, 0–100 (100 = no monsters at large).
 * Every active monster drains a share of what is left: more for a stronger monster
 * (danger 1–5) and a more dangerous place (quest rank D–S), at most 35% each.
 * Slaying it gives that magic back.
 */
export function magicLevel(glitches: GlitchListItem[]) {
  let magic = 1
  for (const g of glitches) {
    if (g.status === 'FIXED') continue
    magic *= 1 - (0.04 * g.danger + 0.03 * g.locationDanger)
  }
  return Math.round(magic * 100)
}

export function magicMood(level: number) {
  if (level >= 80) return { label: 'Flourishing', color: '#7b5cff' }
  if (level >= 50) return { label: 'Flickering', color: '#e0a526' }
  if (level >= 25) return { label: 'Fading', color: '#e0702e' }
  return { label: 'Desync imminent', color: '#d7263d' }
}
