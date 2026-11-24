import { createServerFn } from '@tanstack/react-start'
import { asc } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { monsters } from '#/db/schema.ts'
import { PERMISSIONS } from '#/lib/auth.ts'
import type { Monster } from '#/lib/glitch.ts'
import { requireGuardian } from '#/server/session.ts'

/** The monster index (bestiary), weakest first. */
export const getMonsters = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Monster[]> => {
    requireGuardian(PERMISSIONS.glitchView)
    return db.select().from(monsters).orderBy(asc(monsters.danger)).all()
  },
)
