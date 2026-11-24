/** Lifecycle of a glitch, in order. */
export const GLITCH_STATUSES = [
  'LEAKED',
  'ASSESSING',
  'CONTAINING',
  'FIXED',
] as const

export type GlitchStatus = (typeof GLITCH_STATUSES)[number]

export type Glitch = {
  glitchId: string
  status: GlitchStatus
  description: string
  /** ISO 8601 */
  timestamp: string
}

export type GlitchListItem = Glitch & { echoCount: number }

export type Echo = {
  echoId: number
  glitchId: string
  description: string
  /** ISO 8601 */
  timestamp: string
  reportingGuardianId: number
  reporterCodename: string
}

export type GlitchDetail = Glitch & { echoes: Echo[] }

/** 'GL-0007' for 7. */
export function formatGlitchId(n: number) {
  return `GL-${String(n).padStart(4, '0')}`
}
