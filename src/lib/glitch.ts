/** Lifecycle of a glitch, in order. */
export const GLITCH_STATUSES = [
  'LEAKED',
  'ASSESSING',
  'CONTAINING',
  'FIXED',
] as const

export type GlitchStatus = (typeof GLITCH_STATUSES)[number]

/** How each status reads in the guild theme. The code keeps the original names. */
export const STATUS_LABELS: Record<GlitchStatus, string> = {
  LEAKED: 'Spotted',
  ASSESSING: 'Scouting',
  CONTAINING: 'Engaged',
  FIXED: 'Slain',
}

export type Monster = {
  monsterId: string
  name: string
  description: string
  /** 1..5 */
  danger: number
}

export type Glitch = {
  glitchId: string
  status: GlitchStatus
  description: string
  /** ISO 8601 */
  timestamp: string
  monsterId: string
}

export type GlitchListItem = Glitch & {
  monsterName: string
  danger: number
  echoCount: number
  /** Adventurers sent out to this monster. */
  assignedGuardianIds: number[]
}

export type Echo = {
  echoId: number
  glitchId: string
  description: string
  /** ISO 8601 */
  timestamp: string
  reportingGuardianId: number
  reporterCodename: string
}

export type Assignment = {
  guardianId: number
  codename: string
  /** ISO 8601 */
  assignedAt: string
}

export type GlitchDetail = GlitchListItem & {
  echoes: Echo[]
  assignments: Assignment[]
}

/** 'GL-0007' for 7. */
export function formatGlitchId(n: number) {
  return `GL-${String(n).padStart(4, '0')}`
}
