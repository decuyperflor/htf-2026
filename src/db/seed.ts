import { db } from './index.ts'
import {
  echoes,
  glitchAssignments,
  glitches,
  guardians,
  monsters,
  permissions,
  rolePermissions,
  roles,
  sessions,
} from './schema.ts'
import { hashPassword } from '../server/password.ts'

// ---------- Roles & permissions ----------
// Role ids stay 'defender'/'commander' (the assignment); the names follow the guild theme.

const roleRows: (typeof roles.$inferInsert)[] = [
  { roleId: 'defender', name: 'Adventurer' },
  { roleId: 'commander', name: 'Guild master' },
]

const permissionRows: (typeof permissions.$inferInsert)[] = [
  { permissionId: 'glitch:view', description: 'See monsters and their sightings' },
  { permissionId: 'echo:create', description: 'Report sightings (echoes)' },
  { permissionId: 'glitch:update_status', description: 'Change the status of a monster' },
  { permissionId: 'glitch:assign', description: 'Send adventurers out to a monster' },
  { permissionId: 'glitch:delete', description: 'Remove monsters' },
  { permissionId: 'guardian:manage', description: 'Manage guardians and their roles' },
]

const defenderPermissions = ['glitch:view', 'echo:create']
// A commander can do everything a defender can, plus admin rights.
const commanderPermissions = [
  ...defenderPermissions,
  'glitch:update_status',
  'glitch:assign',
  'glitch:delete',
  'guardian:manage',
]

// ---------- Monster index ----------

const monsterRows: (typeof monsters.$inferInsert)[] = [
  { monsterId: 'slime', name: 'Glitch Slime', danger: 1, description: 'A wobbling blob of corrupted data. Mostly harmless, very sticky.' },
  { monsterId: 'goblin', name: 'Byte Goblin', danger: 2, description: 'Steals seconds from clocks and hides them in its pockets.' },
  { monsterId: 'wraith', name: 'Desync Wraith', danger: 3, description: 'A ghost out of step with time. Things it touches start to lag.' },
  { monsterId: 'golem', name: 'Rune Golem', danger: 4, description: 'Animated by broken spells. Slow, heavy and very hard to stop.' },
  { monsterId: 'dragon', name: 'Chrono Dragon', danger: 5, description: 'Breathes time loops. When it appears, all of Achrona is at risk.' },
]

// ---------- Demo guardians (test accounts, local only) ----------

const DEMO_PASSWORD = 'achrona'
const guardianRows = [
  { codename: 'nova', roleId: 'commander' },
  { codename: 'ember', roleId: 'defender' },
  { codename: 'kael', roleId: 'defender' },
]

// ---------- Glitches (monsters), each opened by its first echo ----------

const glitchRows: (typeof glitches.$inferInsert)[] = [
  { glitchId: 'GL-0142', status: 'LEAKED', monsterId: 'wraith', description: 'Time loop detected near the eastern clock tower', timestamp: '2026-11-10T13:42:00Z' },
  { glitchId: 'GL-0141', status: 'ASSESSING', monsterId: 'goblin', description: 'Magic reserves dropping faster than expected', timestamp: '2026-11-10T11:05:00Z' },
  { glitchId: 'GL-0139', status: 'CONTAINING', monsterId: 'golem', description: 'Portal flicker in the archive vaults', timestamp: '2026-11-09T22:17:00Z' },
  { glitchId: 'GL-0137', status: 'FIXED', monsterId: 'slime', description: 'Echo sensors reporting duplicate signals', timestamp: '2026-11-08T08:30:00Z' },
]

// [glitchId, description, timestamp, reporter codename]
const echoRows: [string, string, string, string][] = [
  ['GL-0142', 'Time loop detected near the eastern clock tower', '2026-11-10T13:42:00Z', 'ember'],
  ['GL-0142', 'Same bell has rung 12 times in the last minute', '2026-11-10T13:47:00Z', 'kael'],
  ['GL-0141', 'Magic reserves dropping faster than expected', '2026-11-10T11:05:00Z', 'kael'],
  ['GL-0139', 'Portal flicker in the archive vaults', '2026-11-09T22:17:00Z', 'ember'],
  ['GL-0139', 'Containment runes placed around the portal', '2026-11-10T07:02:00Z', 'nova'],
  ['GL-0137', 'Echo sensors reporting duplicate signals', '2026-11-08T08:30:00Z', 'kael'],
  ['GL-0137', 'Sensors recalibrated, all signals normal again', '2026-11-08T15:12:00Z', 'nova'],
]

// [glitchId, adventurer codename] — sent out by the guild master.
const assignmentRows: [string, string][] = [['GL-0139', 'ember']]

// Wipe and refill so the seed can be re-run safely (children first).
db.transaction((tx) => {
  tx.delete(glitchAssignments).run()
  tx.delete(echoes).run()
  tx.delete(glitches).run()
  tx.delete(monsters).run()
  tx.delete(sessions).run()
  tx.delete(guardians).run()
  tx.delete(rolePermissions).run()
  tx.delete(permissions).run()
  tx.delete(roles).run()

  tx.insert(roles).values(roleRows).run()
  tx.insert(permissions).values(permissionRows).run()
  tx.insert(rolePermissions)
    .values([
      ...defenderPermissions.map((permissionId) => ({ roleId: 'defender', permissionId })),
      ...commanderPermissions.map((permissionId) => ({ roleId: 'commander', permissionId })),
    ])
    .run()

  const idByCodename = new Map<string, number>()
  for (const g of guardianRows) {
    const { guardianId } = tx
      .insert(guardians)
      .values({ ...g, passwordHash: hashPassword(DEMO_PASSWORD) })
      .returning({ guardianId: guardians.guardianId })
      .get()
    idByCodename.set(g.codename, guardianId)
  }

  tx.insert(monsters).values(monsterRows).run()
  tx.insert(glitches).values(glitchRows).run()
  tx.insert(echoes)
    .values(
      echoRows.map(([glitchId, description, timestamp, codename]) => ({
        glitchId,
        description,
        timestamp,
        reportingGuardianId: idByCodename.get(codename)!,
      })),
    )
    .run()
  tx.insert(glitchAssignments)
    .values(
      assignmentRows.map(([glitchId, codename]) => ({
        glitchId,
        guardianId: idByCodename.get(codename)!,
        assignedAt: '2026-11-10T07:00:00Z',
        assignedBy: idByCodename.get('nova')!,
      })),
    )
    .run()
})

console.log(
  `Seeded ${roleRows.length} roles, ${guardianRows.length} guardians, ${monsterRows.length} monsters, ` +
    `${glitchRows.length} glitches, ${echoRows.length} echoes.`,
)
console.log(`Demo logins: ${guardianRows.map((g) => g.codename).join(', ')} / password "${DEMO_PASSWORD}"`)
