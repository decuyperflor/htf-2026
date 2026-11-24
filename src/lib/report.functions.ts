import { createServerFn } from '@tanstack/react-start'
import { asc, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { bounties, echoes, glitchAssignments, glitches, guardians, locations, monsters, regions } from '#/db/schema.ts'
import { PERMISSIONS } from '#/lib/auth.ts'
import { requireGuardian } from '#/server/session.ts'

export type ChronicleEntry = {
  glitchId: string
  description: string
  spottedAt: string
  slainAt: string | null
  monsterId: string
  monsterName: string
  monsterDanger: number
  locationName: string
  regionName: string
  locationDanger: number
  sightings: { description: string; timestamp: string; reporter: string }[]
  /** Who was on the quest, and the gold each of them collected. */
  party: { codename: string; gold: number }[]
}

/** The chronicle for the High Council: every slain monster, its sightings, its slayers and their gold. */
export const getChronicle = createServerFn({ method: 'GET' }).handler(async (): Promise<ChronicleEntry[]> => {
  requireGuardian(PERMISSIONS.glitchView)

  const rows = db
    .select({
      glitchId: glitches.glitchId,
      description: glitches.description,
      spottedAt: glitches.timestamp,
      slainAt: glitches.slainAt,
      monsterId: monsters.monsterId,
      monsterName: monsters.name,
      monsterDanger: monsters.danger,
      locationName: locations.name,
      regionName: regions.name,
      locationDanger: sql<number>`coalesce(${glitches.danger}, ${locations.danger})`,
    })
    .from(glitches)
    .innerJoin(monsters, eq(monsters.monsterId, glitches.monsterId))
    .innerJoin(locations, eq(locations.locationId, glitches.locationId))
    .innerJoin(regions, eq(regions.regionId, locations.regionId))
    .where(eq(glitches.status, 'FIXED'))
    .orderBy(desc(glitches.slainAt), desc(glitches.timestamp))
    .all()
  if (!rows.length) return []
  const ids = rows.map((r) => r.glitchId)

  const sightings = db
    .select({
      glitchId: echoes.glitchId,
      description: echoes.description,
      timestamp: echoes.timestamp,
      // A guardian's codename, or the villager who reported it.
      reporter: sql<string>`coalesce(${guardians.codename}, ${echoes.reporterName}, 'a villager')`,
    })
    .from(echoes)
    .leftJoin(guardians, eq(guardians.guardianId, echoes.reportingGuardianId))
    .where(inArray(echoes.glitchId, ids))
    .orderBy(asc(echoes.timestamp))
    .all()

  const party = db
    .select({ glitchId: glitchAssignments.glitchId, guardianId: guardians.guardianId, codename: guardians.codename })
    .from(glitchAssignments)
    .innerJoin(guardians, eq(guardians.guardianId, glitchAssignments.guardianId))
    .where(inArray(glitchAssignments.glitchId, ids))
    .all()

  const paid = db
    .select({ glitchId: bounties.glitchId, guardianId: bounties.guardianId, codename: guardians.codename, gold: bounties.gold })
    .from(bounties)
    .innerJoin(guardians, eq(guardians.guardianId, bounties.guardianId))
    .where(inArray(bounties.glitchId, ids))
    .all()
  // Scout + slay bounties of the same adventurer on the same quest: one line in the chronicle.
  const paidTotals = new Map<string, (typeof paid)[number]>()
  for (const b of paid) {
    const key = `${b.glitchId}:${b.guardianId}`
    const prev = paidTotals.get(key)
    paidTotals.set(key, prev ? { ...prev, gold: prev.gold + b.gold } : b)
  }

  return rows.map((r) => {
    // Everyone who was paid, plus party members who joined without a bounty (0 gold).
    const members = new Map<number, { codename: string; gold: number }>()
    for (const p of party.filter((p) => p.glitchId === r.glitchId)) members.set(p.guardianId, { codename: p.codename, gold: 0 })
    for (const b of [...paidTotals.values()].filter((b) => b.glitchId === r.glitchId)) members.set(b.guardianId, { codename: b.codename, gold: b.gold })
    return {
      ...r,
      sightings: sightings.filter((s) => s.glitchId === r.glitchId).map(({ glitchId: _g, ...s }) => s),
      party: [...members.values()],
    }
  })
})
