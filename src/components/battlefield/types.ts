import type { GlitchStatus } from '#/lib/glitch.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'

/** A monster as it is animated on screen (positions in the scene's own units). */
export type GlitchSim = {
  id: string
  description: string
  monsterId: string
  monsterName: string
  echoCount: number
  status: GlitchStatus
  /** performance.now() of the last status change. */
  statusSince: number
  bornAt: number
  /** Set once the glitch is FIXED (or deleted): it gets attacked and explodes. */
  dyingSince: number | null
  x: number
  y: number
  size: number
  targetSize: number
}

/** An adventurer / guild master figure on screen. */
export type SoldierPos = GuardianSummary & {
  x: number
  y: number
  moving: boolean
}
