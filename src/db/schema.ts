import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
// Relative import: drizzle-kit loads this file and doesn't resolve the `#/` alias.
import { GLITCH_STATUSES } from '../lib/glitch.ts'

// ---------- Roles & permissions ----------

export const roles = sqliteTable('roles', {
  /** e.g. 'defender', 'commander' */
  roleId: text('role_id').primaryKey(),
  name: text('name').notNull(),
})

export const permissions = sqliteTable('permissions', {
  /** e.g. 'echo:create' */
  permissionId: text('permission_id').primaryKey(),
  description: text('description').notNull(),
})

export const rolePermissions = sqliteTable(
  'role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => roles.roleId, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permissions.permissionId, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
)

// ---------- Guardians & sessions ----------

export const guardians = sqliteTable('guardians', {
  guardianId: integer('guardian_id').primaryKey({ autoIncrement: true }),
  codename: text('codename').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  roleId: text('role_id')
    .notNull()
    .references(() => roles.roleId),
})

export const sessions = sqliteTable(
  'sessions',
  {
    /** SHA-256 of the cookie token, so a leaked database can't be used to log in. */
    sessionId: text('session_id').primaryKey(),
    guardianId: integer('guardian_id')
      .notNull()
      .references(() => guardians.guardianId, { onDelete: 'cascade' }),
    /** ISO 8601 */
    createdAt: text('created_at').notNull(),
    /** ISO 8601 */
    expiresAt: text('expires_at').notNull(),
    /** ISO 8601; refreshed while the guardian's browser polls, so we know who is online. */
    lastSeenAt: text('last_seen_at'),
  },
  (t) => [index('sessions_guardian_idx').on(t.guardianId)],
)

// ---------- Monster index (bestiary) ----------

export const monsters = sqliteTable('monsters', {
  /** e.g. 'slime'; also selects the sprite drawn on the battlefield. */
  monsterId: text('monster_id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  /** 1 (harmless) .. 5 (deadly): base size of the monster. */
  danger: integer('danger').notNull(),
})

// ---------- World: regions & locations ----------

export const regions = sqliteTable('regions', {
  /** e.g. 'lake'; also selects the artwork on the world map. */
  regionId: text('region_id').primaryKey(),
  name: text('name').notNull(),
})

/** A fixed spot in a region where monsters show up. The guild sets danger + reward. */
export const locations = sqliteTable('locations', {
  /** e.g. 'lake-pier' */
  locationId: text('location_id').primaryKey(),
  regionId: text('region_id')
    .notNull()
    .references(() => regions.regionId),
  name: text('name').notNull(),
  /** Position on the world map (SVG units, 1000 x 600). */
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  /** 1..5, set by the guild master (quest rank D..S). */
  danger: integer('danger').notNull().default(1),
  /** Gold paid to every adventurer on the quest when the monster is slain. */
  reward: integer('reward').notNull().default(50),
})

// ---------- Glitches & echoes ----------

export const glitches = sqliteTable('glitches', {
  /** e.g. 'GL-0142' */
  glitchId: text('glitch_id').primaryKey(),
  status: text('status', { enum: GLITCH_STATUSES }).notNull(),
  description: text('description').notNull(),
  /** ISO 8601, so lexical order is chronological order. */
  timestamp: text('timestamp').notNull(),
  /** What kind of monster this glitch is. */
  monsterId: text('monster_id')
    .notNull()
    .default('slime')
    .references(() => monsters.monsterId),
  /** Where on the map the monster was spotted. */
  locationId: text('location_id')
    .notNull()
    .default('guild-gate')
    .references(() => locations.locationId),
})

/** Gold paid out per adventurer per slain monster (one row each, so never paid twice). */
export const bounties = sqliteTable(
  'bounties',
  {
    glitchId: text('glitch_id')
      .notNull()
      .references(() => glitches.glitchId, { onDelete: 'cascade' }),
    guardianId: integer('guardian_id')
      .notNull()
      .references(() => guardians.guardianId, { onDelete: 'cascade' }),
    gold: integer('gold').notNull(),
    /** ISO 8601 */
    paidAt: text('paid_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.glitchId, t.guardianId] })],
)

/** Adventurers (defenders) on the quest for a monster: accepted themselves or sent by the guild. */
export const glitchAssignments = sqliteTable(
  'glitch_assignments',
  {
    glitchId: text('glitch_id')
      .notNull()
      .references(() => glitches.glitchId, { onDelete: 'cascade' }),
    guardianId: integer('guardian_id')
      .notNull()
      .references(() => guardians.guardianId, { onDelete: 'cascade' }),
    /** ISO 8601 */
    assignedAt: text('assigned_at').notNull(),
    assignedBy: integer('assigned_by')
      .notNull()
      .references(() => guardians.guardianId),
  },
  (t) => [primaryKey({ columns: [t.glitchId, t.guardianId] })],
)

export const echoes = sqliteTable(
  'echoes',
  {
    echoId: integer('echo_id').primaryKey({ autoIncrement: true }),
    glitchId: text('glitch_id')
      .notNull()
      .references(() => glitches.glitchId, { onDelete: 'cascade' }),
    description: text('description').notNull(),
    /** ISO 8601 */
    timestamp: text('timestamp').notNull(),
    reportingGuardianId: integer('reporting_guardian_id')
      .notNull()
      .references(() => guardians.guardianId),
  },
  (t) => [index('echoes_glitch_idx').on(t.glitchId)],
)
