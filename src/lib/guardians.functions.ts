import { createServerFn } from '@tanstack/react-start'
import { asc } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians } from '#/db/schema.ts'
import { PERMISSIONS } from '#/lib/auth.ts'
import { requireGuardian } from '#/server/session.ts'

export type GuardianSummary = {
  guardianId: number
  codename: string
  roleId: string
}

/** All guardians (no secrets), e.g. to draw them on the battlefield. */
export const getGuardians = createServerFn({ method: 'GET' }).handler(
  async (): Promise<GuardianSummary[]> => {
    requireGuardian(PERMISSIONS.glitchView)
    return db
      .select({
        guardianId: guardians.guardianId,
        codename: guardians.codename,
        roleId: guardians.roleId,
      })
      .from(guardians)
      .orderBy(asc(guardians.guardianId))
      .all()
  },
)
