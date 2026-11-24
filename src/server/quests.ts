// Server-only quest rules (kept out of *.functions.ts so the database never reaches the client bundle).
import { and, eq, sql } from 'drizzle-orm'
import type { db } from '#/db/index.ts'
import { bounties, glitchAssignments, glitches, locations } from '#/db/schema.ts'

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** The other monster (not yet slain) this adventurer is fighting, if any. */
export function activeQuestOf(tx: Tx, guardianId: number, exceptGlitchId: string) {
  const row = tx
    .select({ glitchId: glitches.glitchId })
    .from(glitchAssignments)
    .innerJoin(glitches, eq(glitches.glitchId, glitchAssignments.glitchId))
    .where(
      and(
        eq(glitchAssignments.guardianId, guardianId),
        sql`${glitches.status} != 'FIXED'`,
        sql`${glitches.glitchId} != ${exceptGlitchId}`,
      ),
    )
    .get()
  return row?.glitchId ?? null
}

/** The monster is slain: everyone on the quest gets the quest's reward (once). Returns that reward. */
export function payBounties(tx: Tx, glitchId: string) {
  const { reward } = tx
    .select({ reward: sql<number>`coalesce(${glitches.reward}, ${locations.reward})` })
    .from(glitches)
    .innerJoin(locations, eq(locations.locationId, glitches.locationId))
    .where(eq(glitches.glitchId, glitchId))
    .get()!
  const party = tx
    .select({ guardianId: glitchAssignments.guardianId })
    .from(glitchAssignments)
    .where(eq(glitchAssignments.glitchId, glitchId))
    .all()
  if (party.length) {
    const paidAt = new Date().toISOString()
    tx.insert(bounties)
      .values(party.map((p) => ({ glitchId, guardianId: p.guardianId, kind: 'slay' as const, gold: reward, paidAt })))
      .onConflictDoNothing()
      .run()
  }
  return reward
}
