/**
 * Investigating a scouting quest: the server secretly rolls which monster is behind the
 * villagers' reports (the more dangerous, the rarer), the adventurer sees its silhouette and
 * has to pick the matching monster out of three.
 *
 * Kept in memory per quest (like the fight cooldown): reopening the dialog shows the same
 * silhouette, so you cannot reroll a dragon into a slime. A server restart simply rolls again.
 */

export type ScoutMonster = { monsterId: string; name: string; danger: number }

/** Weight per danger level: each step up is half as likely (slime 16 : dragon 1, about 3%). */
const weight = (danger: number) => 2 ** (5 - Math.min(Math.max(danger, 1), 5))

/** Wrong pick: the trail goes cold for a moment. */
export const WRONG_PICK_MS = 5_000

type Clue = { monsterId: string; options: string[]; retryAt: number | null }
const clues = new Map<string, Clue>()

function rollMonster(all: ScoutMonster[]) {
  const total = all.reduce((sum, m) => sum + weight(m.danger), 0)
  let roll = Math.random() * total
  for (const m of all) {
    roll -= weight(m.danger)
    if (roll < 0) return m
  }
  return all[all.length - 1]
}

function shuffle<T>(list: T[]) {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** The quest's clue: the hidden monster plus three options (the right one and two others). */
export function clueFor(glitchId: string, all: ScoutMonster[]) {
  let clue = clues.get(glitchId)
  if (!clue || !all.some((m) => m.monsterId === clue!.monsterId)) {
    const monster = rollMonster(all)
    const decoys = shuffle(all.filter((m) => m.monsterId !== monster.monsterId)).slice(0, 2)
    clue = { monsterId: monster.monsterId, options: shuffle([monster.monsterId, ...decoys.map((m) => m.monsterId)]), retryAt: null }
    clues.set(glitchId, clue)
  }
  return clue
}

/** Check a pick. Right: the clue is used up. Wrong: wait a moment before the next try. */
export function checkPick(glitchId: string, monsterId: string, now = Date.now()) {
  const clue = clues.get(glitchId)
  if (!clue) return { ok: false as const, retryAt: null, reason: 'Look at the silhouette first' }
  if (clue.retryAt && clue.retryAt > now) return { ok: false as const, retryAt: clue.retryAt, reason: 'The trail is still cold' }
  if (clue.monsterId !== monsterId) {
    clue.retryAt = now + WRONG_PICK_MS
    return { ok: false as const, retryAt: clue.retryAt, reason: 'That is not the monster in the shadows' }
  }
  clues.delete(glitchId)
  return { ok: true as const, monsterId }
}
