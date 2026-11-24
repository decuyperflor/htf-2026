// Server-only quest rules (kept out of *.functions.ts so the database never reaches the client bundle).
import { and, eq, sql } from 'drizzle-orm'
import type { db } from '#/db/index.ts'
import { glitchAssignments, glitches } from '#/db/schema.ts'

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
