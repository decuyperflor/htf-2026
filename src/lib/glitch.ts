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
  LEAKED: 'Scouting',
  ASSESSING: 'Spotted',
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
  /** null while it is a scouting quest: nobody has seen the monster yet. */
  monsterId: string | null
  locationId: string
}

export type GlitchListItem = Glitch & {
  /** 'Unknown creature' while scouting. */
  monsterName: string
  /** Danger of the monster type (1..5; 1 while unknown). */
  danger: number
  locationName: string
  regionId: string
  regionName: string
  /** Quest rank 1..5: what the guild master set, else the location's default. */
  locationDanger: number
  /** Gold per party member: what the guild master set, else the location's default. */
  reward: number
  /** The guild master has set the reward: adventurers can accept. */
  rated: boolean
  echoCount: number
  /** Of which reported by villagers. */
  villagerReports: number
  /** Adventurers sent out to this monster. */
  assignedGuardianIds: number[]
}

export type Echo = {
  echoId: number
  glitchId: string
  description: string
  /** ISO 8601 */
  timestamp: string
  reportingGuardianId: number | null
  reporterCodename: string | null
  /** Villager who reported it (when no guardian did). */
  reporterName: string | null
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

/** Where a quest stands for an adventurer. */
export function questStage(g: Pick<GlitchListItem, 'status' | 'monsterId' | 'rated'>) {
  if (g.status === 'FIXED') return 'slain' as const
  if (g.status === 'LEAKED' || !g.monsterId) return 'scouting' as const
  if (g.status === 'ASSESSING' && !g.rated) return 'awaiting-rank' as const
  if (g.status === 'ASSESSING') return 'open' as const
  return 'fighting' as const
}

/** 'GL-0007' for 7. */
export function formatGlitchId(n: number) {
  return `GL-${String(n).padStart(4, '0')}`
}
