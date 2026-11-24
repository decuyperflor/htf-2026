// Shared (client + server) auth types and constants. No server imports here.

export const ROLE_IDS = ['defender', 'commander'] as const
export type RoleId = (typeof ROLE_IDS)[number]

/** Every permission the app checks. Which role has which lives in the database. */
export const PERMISSIONS = {
  glitchView: 'glitch:view',
  echoCreate: 'echo:create',
  glitchUpdateStatus: 'glitch:update_status',
  glitchAssign: 'glitch:assign',
  glitchDelete: 'glitch:delete',
  guardianManage: 'guardian:manage',
} as const
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

export type SessionGuardian = {
  guardianId: number
  codename: string
  roleId: string
  roleName: string
  permissions: Permission[]
}

export function can(guardian: SessionGuardian | null | undefined, permission: Permission) {
  return !!guardian?.permissions.includes(permission)
}
