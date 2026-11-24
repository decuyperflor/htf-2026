import { createServerFn } from '@tanstack/react-start'
import { asc, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { bounties, echoes, glitches, guardians, locations, monsters, regions } from '#/db/schema.ts'
import { PERMISSIONS } from '#/lib/auth.ts'
import type { World } from '#/lib/glitch.ts'
import { requireGuardian } from '#/server/session.ts'

/** All regions and their locations (with the guild's danger + reward). */
export const getWorld = createServerFn({ method: 'GET' }).handler(async (): Promise<World> => {
  requireGuardian(PERMISSIONS.glitchView)
  return {
    regions: db.select().from(regions).orderBy(asc(regions.name)).all(),
    locations: db.select().from(locations).orderBy(asc(locations.name)).all(),
  }
})

/** The guild master sets how dangerous a location is and what slaying a monster there pays. */
export const updateLocation = createServerFn({ method: 'POST' })
  .validator((input: { locationId: string; danger: number; reward: number }) => {
    const danger = Math.round(Number(input?.danger))
    const reward = Math.round(Number(input?.reward))
    if (!(danger >= 1 && danger <= 5)) throw new Error('Danger must be between 1 and 5')
    if (!(reward >= 0 && reward <= 100_000)) throw new Error('Reward must be between 0 and 100000 gold')
    return { locationId: String(input.locationId), danger, reward }
  })
  .handler(async ({ data }) => {
    requireGuardian(PERMISSIONS.locationManage)
    const result = db
      .update(locations)
      .set({ danger: data.danger, reward: data.reward })
      .where(eq(locations.locationId, data.locationId))
      .run()
    if (result.changes === 0) throw new Error(`Location ${data.locationId} not found`)
    return { ok: true }
  })

export type Badge = { id: string; icon: string; label: string; why: string }
export type LeaderboardRow = { guardianId: number; codename: string; gold: number; slain: number; badges: Badge[] }

/** Adventurers ranked by bounty gold. */
export const getLeaderboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<LeaderboardRow[]> => {
    requireGuardian(PERMISSIONS.glitchView)
    const rows = db
      .select({
        guardianId: guardians.guardianId,
        codename: guardians.codename,
        gold: sql<number>`coalesce(sum(${bounties.gold}), 0)`.as('gold'),
        slain: sql<number>`count(case when ${bounties.kind} = 'slay' then 1 end)`,
      })
      .from(guardians)
      .leftJoin(bounties, eq(bounties.guardianId, guardians.guardianId))
      .where(eq(guardians.roleId, 'defender'))
      .groupBy(guardians.guardianId)
      .orderBy(desc(sql`gold`), asc(guardians.codename))
      .all()

    // Strongest kill per adventurer: monster danger and place rank (1–5).
    const toughest = new Map(
      db
        .select({
          guardianId: bounties.guardianId,
          monster: sql<number>`max(${monsters.danger})`,
          place: sql<number>`max(coalesce(${glitches.danger}, ${locations.danger}))`,
        })
        .from(bounties)
        .innerJoin(glitches, eq(glitches.glitchId, bounties.glitchId))
        .innerJoin(monsters, eq(monsters.monsterId, glitches.monsterId))
        .innerJoin(locations, eq(locations.locationId, glitches.locationId))
        .where(eq(bounties.kind, 'slay'))
        .groupBy(bounties.guardianId)
        .all()
        .map((r) => [r.guardianId, r]),
    )
    const sightings = new Map(
      db
        .select({ guardianId: echoes.reportingGuardianId, n: count() })
        .from(echoes)
        .groupBy(echoes.reportingGuardianId)
        .all()
        .map((r) => [r.guardianId, r.n]),
    )

    return rows.map((row, i) => {
      const kill = toughest.get(row.guardianId)
      const badges: Badge[] = []
      if (i === 0 && row.gold > 0) badges.push({ id: 'treasurer', icon: '👑', label: 'Guild Treasurer', why: 'Most gold in the guild' })
      if (kill && (kill.monster >= 5 || kill.place >= 5)) badges.push({ id: 'dragon', icon: '🐉', label: 'Dragon Slayer', why: 'Slew an S-class threat' })
      else if (kill && (kill.monster >= 4 || kill.place >= 4)) badges.push({ id: 'giant', icon: '⚔️', label: 'Giant Slayer', why: 'Slew a rank A monster' })
      if (row.slain >= 3) badges.push({ id: 'veteran', icon: '🛡️', label: 'Veteran', why: '3 or more monsters slain' })
      else if (row.slain >= 1) badges.push({ id: 'first-blood', icon: '🗡️', label: 'First Blood', why: 'First monster slain' })
      if ((sightings.get(row.guardianId) ?? 0) >= 3) badges.push({ id: 'eagle-eye', icon: '👁️', label: 'Eagle Eye', why: '3 or more sightings reported' })
      return { ...row, badges }
    })
  },
)
