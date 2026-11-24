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
})

/** Adventurers (defenders) the guild sent out to a monster. */
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
