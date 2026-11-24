// Server-only: the code puzzle you solve to slay a monster. The answer never leaves the server:
// the client gets the code and a seed, and sends back the seed with its answer.

export type Puzzle = { seed: number; code: string; ask: string }

/** Small seeded random generator (mulberry32), so a seed always gives the same puzzle. */
function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Build the puzzle for a quest rank (1 = D … 5 = S). Each rank adds a concept:
 * D: + and −, C: also ×, B: if/else, A: a for-loop with %, S: a swap and a loop with a condition.
 */
function build(seed: number, rank: number): { code: string; ask: string } {
  const r = rng(seed)
  const int = (min: number, max: number) => min + Math.floor(r() * (max - min + 1))
  const name = (['mana', 'runes', 'gold', 'power', 'shield', 'charm'] as const)[int(0, 5)]
  const a = int(2, 9)
  const b = int(2, 9)
  const c = int(1, 6)

  switch (Math.min(Math.max(rank, 1), 5)) {
    case 1:
      return {
        code: [`let ${name} = ${a}`, `let spell = ${b}`, `${name} = ${name} + spell`, `${name} = ${name} - ${c}`].join('\n'),
        ask: name,
      }
    case 2:
      return {
        code: [
          `let ${name} = ${a}`,
          `let spell = ${b}`,
          `${name} = ${name} * 2`,
          `spell = spell + ${name}`,
          `${name} = spell - ${c}`,
        ].join('\n'),
        ask: name,
      }
    case 3:
      return {
        code: [
          `let ${name} = ${a + b}`,
          `let spell = ${c}`,
          `if (${name} % 2 === 0) {`,
          `  ${name} = ${name} / 2 + spell`,
          `} else {`,
          `  ${name} = ${name} * 3 - spell`,
          `}`,
          `spell = ${name} + ${a}`,
        ].join('\n'),
        ask: r() < 0.5 ? name : 'spell',
      }
    case 4: {
      const n = int(4, 7)
      const k = int(3, 4)
      return {
        code: [
          `let ${name} = ${c}`,
          `for (let i = 1; i <= ${n}; i++) {`,
          `  ${name} = ${name} + (i % ${k})`,
          `}`,
          `${name} = ${name} * 2`,
        ].join('\n'),
        ask: name,
      }
    }
    default: {
      const n = int(4, 6)
      return {
        code: [
          `let ${name} = ${a}`,
          `let spell = ${b}`,
          `let temp = ${name}`,
          `${name} = spell`,
          `spell = temp`,
          `for (let i = 0; i < ${n}; i++) {`,
          `  if (i % 2 === 0) {`,
          `    ${name} = ${name} + spell`,
          `  } else {`,
          `    spell = spell - i`,
          `  }`,
          `}`,
        ].join('\n'),
        ask: r() < 0.5 ? name : 'spell',
      }
    }
  }
}

/** The right answer: run the (generated, trusted) code and read the asked variable. */
function solve(code: string, ask: string): number {
  return Number(new Function(`${code}\nreturn ${ask}`)())
}

export function newPuzzle(rank: number): Puzzle {
  const seed = Math.floor(Math.random() * 2 ** 31)
  return { seed, ...build(seed, rank) }
}

export function checkAnswer(seed: number, rank: number, answer: number) {
  const { code, ask } = build(seed, rank)
  return solve(code, ask) === answer
}

/** After a wrong answer the monster strikes back: no new try for a few seconds. */
export const STRIKE_BACK_MS = 10_000
const strikes = new Map<string, number>()

export function retryAt(glitchId: string, guardianId: number) {
  const at = strikes.get(`${glitchId}:${guardianId}`) ?? 0
  return at > Date.now() ? at : null
}

export function strikeBack(glitchId: string, guardianId: number) {
  const at = Date.now() + STRIKE_BACK_MS
  strikes.set(`${glitchId}:${guardianId}`, at)
  return at
}
