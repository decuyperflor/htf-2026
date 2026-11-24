import { createServerFn } from '@tanstack/react-start'
import { and, asc, count, desc, eq, inArray, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitchAssignments, glitches, guardians, monsters } from '#/db/schema.ts'
import { PERMISSIONS } from '#/lib/auth.ts'
import {
  GLITCH_STATUSES,
  formatGlitchId,
  type GlitchDetail,
  type GlitchListItem,
  type GlitchStatus,
} from '#/lib/glitch.ts'
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
      echoCount: count(echoes.echoId),
    })
    .from(glitches)
    .innerJoin(monsters, eq(monsters.monsterId, glitches.monsterId))
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
  .validator((input: { description: string; glitchId?: string; monsterId?: string }) => ({
    description: cleanDescription(input?.description),
    glitchId: input?.glitchId ? String(input.glitchId) : undefined,
    monsterId: input?.monsterId ? String(input.monsterId) : undefined,
  }))
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

        // Next number after the highest existing 'GL-xxxx'.
        const { maxNo } = tx
          .select({
            maxNo: sql<number>`coalesce(max(cast(substr(${glitches.glitchId}, 4) as integer)), 0)`,
          })
          .from(glitches)
          .get()!
        glitchId = formatGlitchId(maxNo + 1)
        tx.insert(glitches)
          .values({ glitchId, status: 'LEAKED', description: data.description, timestamp, monsterId })
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
    const result = db
      .update(glitches)
      .set({ status: data.status })
      .where(eq(glitches.glitchId, data.glitchId))
      .run()
    if (result.changes === 0) throw new Error(`Glitch ${data.glitchId} not found`)
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
