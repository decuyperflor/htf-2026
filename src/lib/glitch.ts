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

export type Region = { regionId: string; name: string }

export type Location = {
  locationId: string
  regionId: string
  name: string
  x: number
  y: number
  /** 1..5, set by the guild master. */
  danger: number
  /** Gold per adventurer when the monster here is slain. */
  reward: number
}

export type World = { regions: Region[]; locations: Location[] }

/** Quest rank for a location danger 1..5, guild-board style. */
export function questRank(danger: number) {
  return ['D', 'C', 'B', 'A', 'S'][Math.min(Math.max(danger, 1), 5) - 1]
}

export type Glitch = {
  glitchId: string
  status: GlitchStatus
  description: string
  /** ISO 8601 */
  timestamp: string
  monsterId: string
  locationId: string
}

export type GlitchListItem = Glitch & {
  monsterName: string
  /** Danger of the monster type (1..5). */
  danger: number
  locationName: string
  regionId: string
  regionName: string
  /** Danger the guild gave the location (1..5). */
  locationDanger: number
  reward: number
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
