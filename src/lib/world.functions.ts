import { createServerFn } from '@tanstack/react-start'
import { asc, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { bounties, guardians, locations, regions } from '#/db/schema.ts'
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

export type LeaderboardRow = { guardianId: number; codename: string; gold: number; slain: number }

/** Adventurers ranked by bounty gold. */
export const getLeaderboard = createServerFn({ method: 'GET' }).handler(
  async (): Promise<LeaderboardRow[]> => {
    requireGuardian(PERMISSIONS.glitchView)
    return db
      .select({
        guardianId: guardians.guardianId,
        codename: guardians.codename,
        gold: sql<number>`coalesce(sum(${bounties.gold}), 0)`.as('gold'),
        slain: count(bounties.glitchId),
      })
      .from(guardians)
      .leftJoin(bounties, eq(bounties.guardianId, guardians.guardianId))
      .where(eq(guardians.roleId, 'defender'))
      .groupBy(guardians.guardianId)
      .orderBy(desc(sql`gold`), asc(guardians.codename))
      .all()
  },
)
