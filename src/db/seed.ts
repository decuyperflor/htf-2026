import { db } from './index.ts'
import {
  bounties,
  echoes,
  glitchAssignments,
  glitches,
  guardians,
  locations,
  monsters,
  permissions,
  regions,
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
  { permissionId: 'quest:accept', description: 'Accept a quest to fight a monster' },
  { permissionId: 'location:manage', description: 'Set danger and reward of locations' },
]

const defenderPermissions = ['glitch:view', 'echo:create', 'quest:accept']
// A commander can do everything a defender can (except fight: the guild master sends
// adventurers out instead of accepting quests), plus admin rights.
const commanderPermissions = [
  ...defenderPermissions.filter((p) => p !== 'quest:accept'),
  'glitch:update_status',
  'glitch:assign',
  'glitch:delete',
  'guardian:manage',
  'location:manage',
]

// ---------- Monster index ----------

const monsterRows: (typeof monsters.$inferInsert)[] = [
  { monsterId: 'slime', name: 'Glitch Slime', danger: 1, description: 'A wobbling blob of corrupted data. Mostly harmless, very sticky.' },
  { monsterId: 'goblin', name: 'Byte Goblin', danger: 2, description: 'Steals seconds from clocks and hides them in its pockets.' },
  { monsterId: 'wraith', name: 'Desync Wraith', danger: 3, description: 'A ghost out of step with time. Things it touches start to lag.' },
  { monsterId: 'golem', name: 'Rune Golem', danger: 4, description: 'Animated by broken spells. Slow, heavy and very hard to stop.' },
  { monsterId: 'dragon', name: 'Chrono Dragon', danger: 5, description: 'Breathes time loops. When it appears, all of Achrona is at risk.' },
]

// ---------- World map: regions and the locations in them ----------
// Coordinates are in the 1000 x 600 map space of src/components/world/regions.ts.

const regionRows: (typeof regions.$inferInsert)[] = [
  { regionId: 'forest', name: 'Whispering Woods' },
  { regionId: 'peaks', name: 'Ember Peaks' },
  { regionId: 'lake', name: 'Mirror Lake' },
  { regionId: 'marsh', name: 'Gloom Marsh' },
  { regionId: 'desert', name: 'Sunscar Desert' },
  { regionId: 'city', name: 'Achrona City' },
]

const locationRows: (typeof locations.$inferInsert)[] = [
  { locationId: 'elder-tree', regionId: 'forest', name: 'Elder Tree', x: 180, y: 130, danger: 2, reward: 120 },
  { locationId: 'fox-hollow', regionId: 'forest', name: 'Fox Hollow', x: 310, y: 200, danger: 1, reward: 60 },
  { locationId: 'moss-ruins', regionId: 'forest', name: 'Moss Ruins', x: 130, y: 230, danger: 3, reward: 200 },
  { locationId: 'mushroom-ring', regionId: 'forest', name: 'Mushroom Ring', x: 345, y: 110, danger: 1, reward: 70 },
  { locationId: 'crater-rim', regionId: 'peaks', name: 'Crater Rim', x: 820, y: 110, danger: 5, reward: 800 },
  { locationId: 'frost-pass', regionId: 'peaks', name: 'Frost Pass', x: 680, y: 150, danger: 3, reward: 250 },
  { locationId: 'dragons-perch', regionId: 'peaks', name: "Dragon's Perch", x: 860, y: 230, danger: 4, reward: 500 },
  { locationId: 'crystal-mine', regionId: 'peaks', name: 'Crystal Mine', x: 655, y: 235, danger: 2, reward: 160 },
  { locationId: 'old-pier', regionId: 'lake', name: 'Old Pier', x: 150, y: 350, danger: 1, reward: 50 },
  { locationId: 'lily-isle', regionId: 'lake', name: 'Lily Isle', x: 240, y: 430, danger: 2, reward: 110 },
  { locationId: 'waterfall-cave', regionId: 'lake', name: 'Waterfall Cave', x: 120, y: 500, danger: 3, reward: 220 },
  { locationId: 'fishers-cove', regionId: 'lake', name: "Fisher's Cove", x: 295, y: 520, danger: 1, reward: 60 },
  { locationId: 'witch-hut', regionId: 'marsh', name: "Witch's Hut", x: 420, y: 430, danger: 4, reward: 450 },
  { locationId: 'sunken-shrine', regionId: 'marsh', name: 'Sunken Shrine', x: 560, y: 450, danger: 3, reward: 260 },
  { locationId: 'bog-bridge', regionId: 'marsh', name: 'Bog Bridge', x: 480, y: 530, danger: 2, reward: 100 },
  { locationId: 'firefly-hollow', regionId: 'marsh', name: 'Firefly Hollow', x: 370, y: 485, danger: 2, reward: 120 },
  { locationId: 'oasis', regionId: 'desert', name: 'Oasis', x: 720, y: 360, danger: 1, reward: 70 },
  { locationId: 'buried-temple', regionId: 'desert', name: 'Buried Temple', x: 850, y: 420, danger: 4, reward: 520 },
  { locationId: 'glass-dunes', regionId: 'desert', name: 'Glass Dunes', x: 760, y: 510, danger: 2, reward: 140 },
  { locationId: 'scorpion-canyon', regionId: 'desert', name: 'Scorpion Canyon', x: 900, y: 485, danger: 3, reward: 300 },
  { locationId: 'guild-gate', regionId: 'city', name: 'Guild Gate', x: 500, y: 330, danger: 1, reward: 50 },
  { locationId: 'market-square', regionId: 'city', name: 'Market Square', x: 440, y: 262, danger: 1, reward: 40 },
  { locationId: 'castle-gardens', regionId: 'city', name: 'Castle Gardens', x: 565, y: 300, danger: 1, reward: 50 },
]

// ---------- Demo guardians (test accounts, local only) ----------

const DEMO_PASSWORD = 'achrona'
const guardianRows = [
  { codename: 'nova', roleId: 'commander' },
  { codename: 'ember', roleId: 'defender' },
  { codename: 'kael', roleId: 'defender' },
]

// ---------- Glitches (quests), one per step of the workflow ----------
// Scouting (villagers report, monster unknown) → Spotted (identified; the guild master sets
// the reward; the rank follows the monster) → Engaged (party fighting) → Slain.

const glitchRows: (typeof glitches.$inferInsert)[] = [
  // Scouting: villagers keep reporting trouble at Firefly Hollow; nobody has investigated yet.
  { glitchId: 'GL-0145', status: 'LEAKED', monsterId: null, locationId: 'firefly-hollow', description: 'Villagers report strange things at Firefly Hollow: “A child went missing near Firefly Hollow this morning”', timestamp: '2026-11-10T14:30:00Z' },
  // Spotted, waiting for the guild master's reward.
  { glitchId: 'GL-0144', status: 'ASSESSING', monsterId: 'slime', locationId: 'lily-isle', description: 'Lily pads keep teleporting one metre to the left', timestamp: '2026-11-10T14:20:00Z', danger: 1 },
  // Spotted and posted: open for adventurers (the dragon also triggers lockdown).
  { glitchId: 'GL-0143', status: 'ASSESSING', monsterId: 'dragon', locationId: 'crater-rim', description: 'The volcano erupts every hour on the hour, backwards', timestamp: '2026-11-10T14:05:00Z', danger: 5, reward: 800 },
  { glitchId: 'GL-0141', status: 'ASSESSING', monsterId: 'goblin', locationId: 'fox-hollow', description: 'Magic reserves dropping faster than expected', timestamp: '2026-11-10T11:05:00Z', danger: 1, reward: 60 },
  // Engaged: a party is on it (kael is offline, so he sleeps next to the wraith).
  { glitchId: 'GL-0142', status: 'CONTAINING', monsterId: 'wraith', locationId: 'witch-hut', description: 'Time loop detected near the eastern clock tower', timestamp: '2026-11-10T13:42:00Z', danger: 4, reward: 450 },
  { glitchId: 'GL-0139', status: 'CONTAINING', monsterId: 'golem', locationId: 'buried-temple', description: 'Portal flicker in the archive vaults', timestamp: '2026-11-09T22:17:00Z', danger: 4, reward: 520 },
  // Slain.
  { glitchId: 'GL-0137', status: 'FIXED', monsterId: 'slime', locationId: 'old-pier', description: 'Echo sensors reporting duplicate signals', timestamp: '2026-11-08T08:30:00Z', slainAt: '2026-11-08T15:12:00Z', danger: 1, reward: 50 },
  { glitchId: 'GL-0136', status: 'FIXED', monsterId: 'goblin', locationId: 'mushroom-ring', description: 'Mushrooms in the fairy ring keep resetting to yesterday', timestamp: '2026-11-07T10:20:00Z', slainAt: '2026-11-07T16:45:00Z', danger: 1, reward: 70 },
  { glitchId: 'GL-0135', status: 'FIXED', monsterId: 'wraith', locationId: 'waterfall-cave', description: 'The waterfall flows upwards every full hour', timestamp: '2026-11-06T21:03:00Z', slainAt: '2026-11-07T09:30:00Z', danger: 3, reward: 220 },
]

// [glitchId, description, timestamp, reporter]: a guardian's codename, or a villager ('villager:Name').
const echoRows: [string, string, string, string][] = [
  ['GL-0145', 'A child went missing near Firefly Hollow this morning', '2026-11-10T14:24:00Z', 'villager:Granny Willow'],
  ['GL-0145', 'Green lights dance around Firefly Hollow at night', '2026-11-10T14:27:00Z', 'villager:Farmer Odo'],
  ['GL-0145', 'Something big growled under Firefly Hollow', '2026-11-10T14:30:00Z', 'villager:Little Pip'],
  ['GL-0142', 'Every clock at Witch\'s Hut runs backwards', '2026-11-10T13:35:00Z', 'villager:Sister Elowen'],
  ['GL-0142', 'Time loop detected near the eastern clock tower', '2026-11-10T13:42:00Z', 'ember'],
  ['GL-0142', 'Same bell has rung 12 times in the last minute', '2026-11-10T13:47:00Z', 'kael'],
  ['GL-0141', 'Magic reserves dropping faster than expected', '2026-11-10T11:05:00Z', 'kael'],
  ['GL-0139', 'Portal flicker in the archive vaults', '2026-11-09T22:17:00Z', 'ember'],
  ['GL-0139', 'Containment runes placed around the portal', '2026-11-10T07:02:00Z', 'nova'],
  ['GL-0137', 'Echo sensors reporting duplicate signals', '2026-11-08T08:30:00Z', 'kael'],
  ['GL-0137', 'Sensors recalibrated, all signals normal again', '2026-11-08T15:12:00Z', 'nova'],
  ['GL-0136', 'Mushrooms in the fairy ring keep resetting to yesterday', '2026-11-07T10:20:00Z', 'ember'],
  ['GL-0136', 'A goblin was seen pocketing hours near the ring', '2026-11-07T12:02:00Z', 'kael'],
  ['GL-0136', 'Goblin cornered and defeated, time flows normally', '2026-11-07T16:45:00Z', 'ember'],
  ['GL-0135', 'The waterfall flows upwards every full hour', '2026-11-06T21:03:00Z', 'kael'],
  ['GL-0135', 'Wraith banished, the water falls down again', '2026-11-07T09:30:00Z', 'ember'],
  ['GL-0143', 'The volcano erupts every hour on the hour, backwards', '2026-11-10T14:05:00Z', 'kael'],
  ['GL-0143', 'Smoke is flowing back into the crater', '2026-11-10T14:09:00Z', 'ember'],
  ['GL-0143', 'Lava froze mid-air above the rim', '2026-11-10T14:12:00Z', 'kael'],
  ['GL-0144', 'Lily pads keep teleporting one metre to the left', '2026-11-10T14:20:00Z', 'ember'],
]

/** Loose villager reports (no quest yet): one more at Moss Ruins and a scouting quest opens. */
const looseReports: [string, string, string][] = [
  ['moss-ruins', 'Footprints at Moss Ruins that walk away from nowhere', 'Hob the shepherd'],
  ['moss-ruins', 'Sheep near Moss Ruins keep vanishing one by one', 'Nell the milkmaid'],
  ['oasis', 'Rain at Oasis falls upwards', 'Wren the courier'],
]

// [glitchId, adventurer codename] — sent out by the guild master.
const assignmentRows: [string, string][] = [
  ['GL-0139', 'ember'],
  ['GL-0142', 'kael'],
  ['GL-0137', 'kael'],
  ['GL-0136', 'ember'],
  ['GL-0136', 'kael'],
  ['GL-0135', 'ember'],
]

// [glitchId, adventurer codename, gold] — paid out for monsters already slain.
const bountyRows: [string, string, number, string][] = [
  ['GL-0137', 'kael', 50, '2026-11-08T15:12:00Z'],
  ['GL-0136', 'ember', 70, '2026-11-07T16:45:00Z'],
  ['GL-0136', 'kael', 70, '2026-11-07T16:45:00Z'],
  ['GL-0135', 'ember', 220, '2026-11-07T09:30:00Z'],
]

// Wipe and refill so the seed can be re-run safely (children first).
db.transaction((tx) => {
  tx.delete(bounties).run()
  tx.delete(glitchAssignments).run()
  tx.delete(echoes).run()
  tx.delete(glitches).run()
  tx.delete(locations).run()
  tx.delete(regions).run()
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
  tx.insert(regions).values(regionRows).run()
  tx.insert(locations).values(locationRows).run()
  tx.insert(glitches).values(glitchRows).run()
  const locationOf = new Map(glitchRows.map((g) => [g.glitchId, g.locationId]))
  tx.insert(echoes)
    .values(
      echoRows.map(([glitchId, description, timestamp, reporter]) => ({
        glitchId,
        locationId: locationOf.get(glitchId),
        description,
        timestamp,
        ...(reporter.startsWith('villager:')
          ? { reporterName: reporter.slice('villager:'.length) }
          : { reportingGuardianId: idByCodename.get(reporter)! }),
      })),
    )
    .run()
  // Recent, so they still count towards opening a scouting quest.
  const now = Date.now()
  tx.insert(echoes)
    .values(
      looseReports.map(([locationId, description, reporterName], i) => ({
        glitchId: null,
        locationId,
        description,
        reporterName,
        timestamp: new Date(now - (looseReports.length - i) * 60_000).toISOString(),
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
  tx.insert(bounties)
    .values(
      bountyRows.map(([glitchId, codename, gold, paidAt]) => ({
        glitchId,
        guardianId: idByCodename.get(codename)!,
        kind: 'slay' as const,
        gold,
        paidAt,
      })),
    )
    .run()
})

console.log(
  `Seeded ${roleRows.length} roles, ${guardianRows.length} guardians, ${monsterRows.length} monsters, ` +
    `${regionRows.length} regions, ${locationRows.length} locations, ${glitchRows.length} glitches, ${echoRows.length + looseReports.length} echoes.`,
)
console.log(`Demo logins: ${guardianRows.map((g) => g.codename).join(', ')} / password "${DEMO_PASSWORD}"`)
