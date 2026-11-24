import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import {
  echoes,
  glitchAssignments,
  glitches,
  guardians,
  locations,
  monsters,
  regions,
} from '#/db/schema.ts'
import { PERMISSIONS } from '#/lib/auth.ts'
import {
  GLITCH_STATUSES,
  formatGlitchId,
  type GlitchDetail,
  type GlitchListItem,
  type GlitchStatus,
} from '#/lib/glitch.ts'
import { activeQuestOf, payBounties } from '#/server/quests.ts'
import { requireGuardian } from '#/server/session.ts'

const MAX_DESCRIPTION = 1000

function cleanDescription(value: unknown) {
  const description = String(value ?? '').trim()
  if (!description) throw new Error('Description is required')
  if (description.length > MAX_DESCRIPTION) {
    throw new Error(`Description is limited to ${MAX_DESCRIPTION} characters`)
  }
  return description
}

/** Glitches with their monster, echo count and assigned adventurers. */
function listGlitches(glitchId?: string): GlitchListItem[] {
  const rows = db
    .select({
      glitchId: glitches.glitchId,
      status: glitches.status,
      description: glitches.description,
      timestamp: glitches.timestamp,
      monsterId: glitches.monsterId,
      monsterName: monsters.name,
      danger: monsters.danger,
      locationId: glitches.locationId,
      locationName: locations.name,
      regionId: regions.regionId,
      regionName: regions.name,
      locationDanger: locations.danger,
      reward: locations.reward,
      echoCount: count(echoes.echoId),
    })
    .from(glitches)
    .innerJoin(monsters, eq(monsters.monsterId, glitches.monsterId))
    .innerJoin(locations, eq(locations.locationId, glitches.locationId))
    .innerJoin(regions, eq(regions.regionId, locations.regionId))
    .leftJoin(echoes, eq(echoes.glitchId, glitches.glitchId))
    .where(glitchId ? eq(glitches.glitchId, glitchId) : undefined)
    .groupBy(glitches.glitchId)
    .orderBy(desc(glitches.timestamp))
    .all()

  const assigned = new Map<string, number[]>()
  for (const a of db
    .select({ glitchId: glitchAssignments.glitchId, guardianId: glitchAssignments.guardianId })
    .from(glitchAssignments)
    .where(glitchId ? eq(glitchAssignments.glitchId, glitchId) : undefined)
    .all()) {
    assigned.set(a.glitchId, [...(assigned.get(a.glitchId) ?? []), a.guardianId])
  }

  return rows.map((r) => ({ ...r, assignedGuardianIds: assigned.get(r.glitchId) ?? [] }))
}

export const getGlitches = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GlitchListItem[]> => {
    requireGuardian(PERMISSIONS.glitchView)
    return listGlitches()
  },
)

export const getGlitch = createServerFn({ method: 'GET' })
  .validator((glitchId: string) => String(glitchId))
  .handler(async ({ data: glitchId }): Promise<GlitchDetail | null> => {
    requireGuardian(PERMISSIONS.glitchView)
    const [glitch] = listGlitches(glitchId)
    if (!glitch) return null

    const glitchEchoes = db
      .select({
        echoId: echoes.echoId,
        glitchId: echoes.glitchId,
        description: echoes.description,
        timestamp: echoes.timestamp,
        reportingGuardianId: echoes.reportingGuardianId,
        reporterCodename: guardians.codename,
      })
      .from(echoes)
      .innerJoin(guardians, eq(guardians.guardianId, echoes.reportingGuardianId))
      .where(eq(echoes.glitchId, glitchId))
      .orderBy(asc(echoes.timestamp))
      .all()

    const assignments = db
      .select({
        guardianId: glitchAssignments.guardianId,
        codename: guardians.codename,
        assignedAt: glitchAssignments.assignedAt,
      })
      .from(glitchAssignments)
      .innerJoin(guardians, eq(guardians.guardianId, glitchAssignments.guardianId))
      .where(eq(glitchAssignments.glitchId, glitchId))
      .orderBy(asc(guardians.codename))
      .all()

    return { ...glitch, echoes: glitchEchoes, assignments }
  })

/**
 * Report an echo (a sighting). Without `glitchId` the echo opens a new glitch
 * (every echo is a glitch by default) of the chosen monster type; with
 * `glitchId` it is added to that glitch.
 */
export const reportEcho = createServerFn({ method: 'POST' })
  .validator(
    (input: { description: string; glitchId?: string; monsterId?: string; locationId?: string }) => ({
      description: cleanDescription(input?.description),
      glitchId: input?.glitchId ? String(input.glitchId) : undefined,
      monsterId: input?.monsterId ? String(input.monsterId) : undefined,
      locationId: input?.locationId ? String(input.locationId) : undefined,
    }),
  )
  .handler(async ({ data }) => {
    const guardian = requireGuardian(PERMISSIONS.echoCreate)
    const timestamp = new Date().toISOString()

    return db.transaction((tx) => {
      let glitchId = data.glitchId
      if (glitchId) {
        const exists = tx.select().from(glitches).where(eq(glitches.glitchId, glitchId)).get()
        if (!exists) throw new Error(`Glitch ${glitchId} not found`)
      } else {
        const monsterId = data.monsterId ?? 'slime'
        const monster = tx.select().from(monsters).where(eq(monsters.monsterId, monsterId)).get()
        if (!monster) throw new Error(`Unknown monster: ${monsterId}`)
        if (!data.locationId) throw new Error('Choose where you saw the monster')
        const location = tx.select().from(locations).where(eq(locations.locationId, data.locationId)).get()
        if (!location) throw new Error(`Unknown location: ${data.locationId}`)

        // Next number after the highest existing 'GL-xxxx'.
        const { maxNo } = tx
          .select({
            maxNo: sql<number>`coalesce(max(cast(substr(${glitches.glitchId}, 4) as integer)), 0)`,
          })
          .from(glitches)
          .get()!
        glitchId = formatGlitchId(maxNo + 1)
        tx.insert(glitches)
          .values({
            glitchId,
            status: 'LEAKED',
            description: data.description,
            timestamp,
            monsterId,
            locationId: location.locationId,
          })
          .run()
      }

      tx.insert(echoes)
        .values({
          glitchId,
          description: data.description,
          timestamp,
          reportingGuardianId: guardian.guardianId,
        })
        .run()

      return { glitchId }
    })
  })

export const updateGlitchStatus = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; status: GlitchStatus }) => {
    if (!GLITCH_STATUSES.includes(input?.status)) throw new Error('Invalid status')
    return { glitchId: String(input.glitchId), status: input.status }
  })
  .handler(async ({ data }) => {
    requireGuardian(PERMISSIONS.glitchUpdateStatus)
    db.transaction((tx) => {
      const result = tx
        .update(glitches)
        .set({ status: data.status, slainAt: data.status === 'FIXED' ? new Date().toISOString() : null })
        .where(eq(glitches.glitchId, data.glitchId))
        .run()
      if (result.changes === 0) throw new Error(`Glitch ${data.glitchId} not found`)

      if (data.status === 'FIXED') payBounties(tx, data.glitchId)
    })
    return { ok: true }
  })

/**
 * A party member reports the monster slain: the quest is complete, the whole party
 * collects the reward and is free to take the next quest.
 */
export const completeQuest = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string }) => ({ glitchId: String(input?.glitchId) }))
  .handler(async ({ data }) => {
    const adventurer = requireGuardian(PERMISSIONS.questAccept)
    const reward = db.transaction((tx) => {
      const glitch = tx.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
      if (!glitch) throw new Error(`Glitch ${data.glitchId} not found`)
      if (glitch.status === 'FIXED') throw new Error('This monster has already been slain')
      const member = tx
        .select({ id: glitchAssignments.guardianId })
        .from(glitchAssignments)
        .where(and(eq(glitchAssignments.glitchId, data.glitchId), eq(glitchAssignments.guardianId, adventurer.guardianId)))
        .get()
      if (!member) throw new Error('Only the quest party can complete this quest')
      tx.update(glitches)
        .set({ status: 'FIXED', slainAt: new Date().toISOString() })
        .where(eq(glitches.glitchId, data.glitchId))
        .run()
      return payBounties(tx, data.glitchId)
    })
    return { ok: true, reward }
  })

/** An adventurer takes on (or leaves) the quest for a monster. */
export const setQuestAccepted = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; accepted: boolean }) => ({
    glitchId: String(input?.glitchId),
    accepted: Boolean(input?.accepted),
  }))
  .handler(async ({ data }) => {
    const adventurer = requireGuardian(PERMISSIONS.questAccept)
    db.transaction((tx) => {
      const glitch = tx.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
      if (!glitch) throw new Error(`Glitch ${data.glitchId} not found`)
      if (glitch.status === 'FIXED') throw new Error('This monster has already been slain')

      if (data.accepted) {
        const busy = activeQuestOf(tx, adventurer.guardianId, data.glitchId)
        if (busy) throw new Error(`You're already on quest ${busy}. Leave that quest first – one monster at a time!`)
        tx.insert(glitchAssignments)
          .values({
            glitchId: data.glitchId,
            guardianId: adventurer.guardianId,
            assignedAt: new Date().toISOString(),
            assignedBy: adventurer.guardianId,
          })
          .onConflictDoNothing()
          .run()
      } else {
        tx.delete(glitchAssignments)
          .where(
            and(
              eq(glitchAssignments.glitchId, data.glitchId),
              eq(glitchAssignments.guardianId, adventurer.guardianId),
            ),
          )
          .run()
      }
    })
    return { ok: true }
  })

/** The guild sends out exactly these adventurers (defenders) to a monster. */
export const assignAdventurers = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; guardianIds: number[] }) => {
    const guardianIds = [...new Set((input?.guardianIds ?? []).map(Number))]
    if (guardianIds.some((id) => !Number.isInteger(id))) throw new Error('Invalid adventurer')
    return { glitchId: String(input.glitchId), guardianIds }
  })
  .handler(async ({ data }) => {
    const guild = requireGuardian(PERMISSIONS.glitchAssign)
    const now = new Date().toISOString()

    db.transaction((tx) => {
      const glitch = tx.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
      if (!glitch) throw new Error(`Glitch ${data.glitchId} not found`)

      if (data.guardianIds.length) {
        const adventurers = tx
          .select({ guardianId: guardians.guardianId })
          .from(guardians)
          .where(and(inArray(guardians.guardianId, data.guardianIds), eq(guardians.roleId, 'defender')))
          .all()
        if (adventurers.length !== data.guardianIds.length) {
          throw new Error('Only adventurers (defenders) can be sent out')
        }
      }

      const current = tx
        .select({ guardianId: glitchAssignments.guardianId })
        .from(glitchAssignments)
        .where(eq(glitchAssignments.glitchId, data.glitchId))
        .all()
        .map((a) => a.guardianId)

      for (const guardianId of data.guardianIds.filter((id) => !current.includes(id))) {
        const busy = activeQuestOf(tx, guardianId, data.glitchId)
        if (busy) {
          const who = tx.select({ codename: guardians.codename }).from(guardians).where(eq(guardians.guardianId, guardianId)).get()
          throw new Error(`${who?.codename ?? 'That adventurer'} is already on quest ${busy} – one monster at a time`)
        }
      }

      const toRemove = current.filter((id) => !data.guardianIds.includes(id))
      const toAdd = data.guardianIds.filter((id) => !current.includes(id))

      if (toRemove.length) {
        tx.delete(glitchAssignments)
          .where(
            and(
              eq(glitchAssignments.glitchId, data.glitchId),
              inArray(glitchAssignments.guardianId, toRemove),
            ),
          )
          .run()
      }
      if (toAdd.length) {
        tx.insert(glitchAssignments)
          .values(
            toAdd.map((guardianId) => ({
              glitchId: data.glitchId,
              guardianId,
              assignedAt: now,
              assignedBy: guild.guardianId,
            })),
          )
          .run()
      }
    })
    return { ok: true }
  })

export const deleteGlitch = createServerFn({ method: 'POST' })
  .validator((glitchId: string) => String(glitchId))
  .handler(async ({ data: glitchId }) => {
    requireGuardian(PERMISSIONS.glitchDelete)
    db.delete(glitches).where(eq(glitches.glitchId, glitchId)).run()
    return { ok: true }
  })

export type Threat = { glitchId: string; monsterName: string; locationName: string; regionName: string }

/**
 * S-class threats still at large (a danger-5 monster, or any monster at a rank-S location).
 * While there is at least one, the whole guild is in lockdown.
 */
export const getThreats = createServerFn({ method: 'GET' }).handler(async (): Promise<Threat[]> => {
  requireGuardian(PERMISSIONS.glitchView)
  return db
    .select({
      glitchId: glitches.glitchId,
      monsterName: monsters.name,
      locationName: locations.name,
      regionName: regions.name,
    })
    .from(glitches)
    .innerJoin(monsters, eq(monsters.monsterId, glitches.monsterId))
    .innerJoin(locations, eq(locations.locationId, glitches.locationId))
    .innerJoin(regions, eq(regions.regionId, locations.regionId))
    .where(sql`${glitches.status} != 'FIXED' and (${monsters.danger} >= 5 or ${locations.danger} >= 5)`)
    .orderBy(desc(glitches.timestamp))
    .all()
})
