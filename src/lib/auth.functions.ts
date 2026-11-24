import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians } from '#/db/schema.ts'
import { verifyPassword } from '#/server/password.ts'
import { createSession, destroySession, getSessionGuardian } from '#/server/session.ts'

export const getSession = createServerFn({ method: 'GET' }).handler(async () =>
  getSessionGuardian(),
)

export const login = createServerFn({ method: 'POST' })
  .validator((input: { codename: string; password: string }) => {
    const codename = String(input?.codename ?? '').trim()
    const password = String(input?.password ?? '')
    if (!codename || !password) throw new Error('Codename and password are required')
    return { codename, password }
  })
  .handler(async ({ data }) => {
    const guardian = db
      .select()
      .from(guardians)
      .where(eq(guardians.codename, data.codename))
      .get()
    // Same message either way, so you can't probe which codenames exist.
    if (!guardian || !verifyPassword(data.password, guardian.passwordHash)) {
      throw new Error('Invalid codename or password')
    }
    createSession(guardian.guardianId)
    return { ok: true }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  destroySession()
  return { ok: true }
})
