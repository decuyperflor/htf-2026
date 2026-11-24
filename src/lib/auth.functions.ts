import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians } from '#/db/schema.ts'
import { hashPassword, verifyPassword } from '#/server/password.ts'
import { createSession, destroySession, getSessionGuardian } from '#/server/session.ts'

/** Codenames are case-insensitive: stored and compared in lowercase. */
const CODENAME = /^[a-z0-9_-]{3,20}$/
const MIN_PASSWORD = 8

export const getSession = createServerFn({ method: 'GET' }).handler(async () =>
  getSessionGuardian(),
)

export const login = createServerFn({ method: 'POST' })
  .validator((input: { codename: string; password: string }) => {
    const codename = String(input?.codename ?? '').trim().toLowerCase()
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

/**
 * Join the guild. Everyone starts as an adventurer (defender): only an existing
 * guild master can hand out more rights, so nobody can sign up as commander.
 */
export const register = createServerFn({ method: 'POST' })
  .validator((input: { codename: string; password: string }) => {
    const codename = String(input?.codename ?? '').trim().toLowerCase()
    const password = String(input?.password ?? '')
    if (!CODENAME.test(codename)) {
      throw new Error('Codename: 3–20 characters, only letters, numbers, - and _')
    }
    if (password.length < MIN_PASSWORD) throw new Error(`Password: at least ${MIN_PASSWORD} characters`)
    if (password.length > 200) throw new Error('Password is too long')
    return { codename, password }
  })
  .handler(async ({ data }) => {
    const taken = db.select({ id: guardians.guardianId }).from(guardians).where(eq(guardians.codename, data.codename)).get()
    if (taken) throw new Error('That codename is already in the guild register')

    const { guardianId } = db
      .insert(guardians)
      .values({ codename: data.codename, passwordHash: hashPassword(data.password), roleId: 'defender' })
      .returning({ guardianId: guardians.guardianId })
      .get()
    createSession(guardianId)
    return { ok: true }
  })

export const logout = createServerFn({ method: 'POST' }).handler(async () => {
  destroySession()
  return { ok: true }
})
