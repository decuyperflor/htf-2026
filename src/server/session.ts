// Server-only session handling: a random token in an httpOnly cookie,
// its SHA-256 hash as the row id in the `sessions` table.
import { createHash, randomBytes } from 'node:crypto'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { and, eq, gt, lt, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { bounties, guardians, rolePermissions, roles, sessions } from '#/db/schema.ts'
import type { Permission, SessionGuardian } from '#/lib/auth.ts'

export const SESSION_COOKIE = 'htf_session'
const SESSION_DAYS = 7

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function createSession(guardianId: number) {
  const token = randomBytes(32).toString('hex')
  const now = new Date()
  const expires = new Date(now.getTime() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  // Opportunistic cleanup of expired sessions.
  db.delete(sessions).where(lt(sessions.expiresAt, now.toISOString())).run()

  db.insert(sessions)
    .values({
      sessionId: hashToken(token),
      guardianId,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      lastSeenAt: now.toISOString(),
    })
    .run()

  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires,
  })
}

export function destroySession() {
  const token = getCookie(SESSION_COOKIE)
  if (token) db.delete(sessions).where(eq(sessions.sessionId, hashToken(token))).run()
  deleteCookie(SESSION_COOKIE, { path: '/' })
}

/** The logged-in guardian with their permissions, or null. */
export function getSessionGuardian(): SessionGuardian | null {
  const token = getCookie(SESSION_COOKIE)
  if (!token) return null

  const sessionId = hashToken(token)
  const now = new Date()
  const row = db
    .select({
      lastSeenAt: sessions.lastSeenAt,
      guardianId: guardians.guardianId,
      codename: guardians.codename,
      roleId: roles.roleId,
      roleName: roles.name,
    })
    .from(sessions)
    .innerJoin(guardians, eq(guardians.guardianId, sessions.guardianId))
    .innerJoin(roles, eq(roles.roleId, guardians.roleId))
    .where(
      and(
        eq(sessions.sessionId, sessionId),
        gt(sessions.expiresAt, now.toISOString()),
      ),
    )
    .get()
  if (!row) return null

  // Presence: every request is a heartbeat (written at most every few seconds).
  if (!row.lastSeenAt || now.getTime() - Date.parse(row.lastSeenAt) > 5000) {
    db.update(sessions).set({ lastSeenAt: now.toISOString() }).where(eq(sessions.sessionId, sessionId)).run()
  }

  const perms = db
    .select({ permissionId: rolePermissions.permissionId })
    .from(rolePermissions)
    .where(eq(rolePermissions.roleId, row.roleId))
    .all()

  const { gold } = db
    .select({ gold: sql<number>`coalesce(sum(${bounties.gold}), 0)` })
    .from(bounties)
    .where(eq(bounties.guardianId, row.guardianId))
    .get()!

  const { lastSeenAt: _seen, ...guardian } = row
  return { ...guardian, permissions: perms.map((p) => p.permissionId as Permission), gold }
}

/** Throws unless someone is logged in and (optionally) has the permission. */
export function requireGuardian(permission?: Permission): SessionGuardian {
  const guardian = getSessionGuardian()
  if (!guardian) throw new Error('Not logged in')
  if (permission && !guardian.permissions.includes(permission)) {
    throw new Error(`Missing permission: ${permission}`)
  }
  return guardian
}
