import { createServerFn } from '@tanstack/react-start'
import { asc, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians } from '#/db/schema.ts'
import { PERMISSIONS } from '#/lib/auth.ts'
import { requireGuardian } from '#/server/session.ts'

export type GuardianSummary = {
  guardianId: number
  codename: string
  roleId: string
  /** Their browser checked in recently (logged in with the app open). */
  online: boolean
}

/** Without a heartbeat for this long, a guardian counts as offline (asleep). */
const ONLINE_MS = 20_000

/** All guardians (no secrets), e.g. to draw them on the battlefield. */
export const getGuardians = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GuardianSummary[]> => {
    requireGuardian(PERMISSIONS.glitchView)
    const now = new Date()
    const cutoff = new Date(now.getTime() - ONLINE_MS).toISOString()
    const rows = db
      .select({
        guardianId: guardians.guardianId,
        codename: guardians.codename,
        roleId: guardians.roleId,
        // Table names spelled out: drizzle leaves columns unqualified inside raw SQL.
        online: sql<number>`exists(
          select 1 from "sessions" s
          where s."guardian_id" = "guardians"."guardian_id"
            and s."last_seen_at" > ${cutoff}
            and s."expires_at" > ${now.toISOString()}
        )`,
      })
      .from(guardians)
      .orderBy(asc(guardians.guardianId))
      .all()
    return rows.map((r) => ({ ...r, online: Boolean(r.online) }))
  },
)
