import { createServerFn } from '@tanstack/react-start'
import { asc, count, desc, eq, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
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

export const getGlitches = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GlitchListItem[]> => {
    requireGuardian(PERMISSIONS.glitchView)
    return db
      .select({
        glitchId: glitches.glitchId,
        status: glitches.status,
        description: glitches.description,
        timestamp: glitches.timestamp,
        echoCount: count(echoes.echoId),
      })
      .from(glitches)
      .leftJoin(echoes, eq(echoes.glitchId, glitches.glitchId))
      .groupBy(glitches.glitchId)
      .orderBy(desc(glitches.timestamp))
      .all()
  },
)

export const getGlitch = createServerFn({ method: 'GET' })
  .validator((glitchId: string) => String(glitchId))
  .handler(async ({ data: glitchId }): Promise<GlitchDetail | null> => {
    requireGuardian(PERMISSIONS.glitchView)
    const glitch = db.select().from(glitches).where(eq(glitches.glitchId, glitchId)).get()
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

    return { ...glitch, echoes: glitchEchoes }
  })

/**
 * Report an echo. Without `glitchId` the echo opens a new glitch (every echo
 * is a glitch by default); with `glitchId` it is added to that glitch.
 */
export const reportEcho = createServerFn({ method: 'POST' })
  .validator((input: { description: string; glitchId?: string }) => ({
    description: cleanDescription(input?.description),
    glitchId: input?.glitchId ? String(input.glitchId) : undefined,
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
        // Next number after the highest existing 'GL-xxxx'.
        const { maxNo } = tx
          .select({
            maxNo: sql<number>`coalesce(max(cast(substr(${glitches.glitchId}, 4) as integer)), 0)`,
          })
          .from(glitches)
          .get()!
        glitchId = formatGlitchId(maxNo + 1)
        tx.insert(glitches)
          .values({ glitchId, status: 'LEAKED', description: data.description, timestamp })
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

export const deleteGlitch = createServerFn({ method: 'POST' })
  .validator((glitchId: string) => String(glitchId))
  .handler(async ({ data: glitchId }) => {
    requireGuardian(PERMISSIONS.glitchDelete)
    db.delete(glitches).where(eq(glitches.glitchId, glitchId)).run()
    return { ok: true }
  })
