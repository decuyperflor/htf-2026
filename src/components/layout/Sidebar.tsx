import { Link, useRouter } from '@tanstack/react-router'
import { Activity, LayoutGrid, LogOut, Plus, type LucideIcon } from 'lucide-react'
import { PERMISSIONS, can, type Permission, type SessionGuardian } from '#/lib/auth.ts'
import { logout } from '#/lib/auth.functions.ts'

type NavItem = {
  label: string
  icon: LucideIcon
  to: '/' | '/report'
  /** Only shown when the guardian has this permission. */
  permission?: Permission
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutGrid, to: '/' },
  { label: 'Report echo', icon: Plus, to: '/report', permission: PERMISSIONS.echoCreate },
]

// Icon-only items: the label lives in aria-label/title for screen readers and hover.
const itemClass =
  'flex size-12 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white'
const activeClass = 'bg-white/10 text-white'

export function Sidebar({ guardian }: { guardian: SessionGuardian }) {
  const router = useRouter()

  async function onLogout() {
    await logout()
    await router.invalidate()
    await router.navigate({ to: '/login' })
  }

  return (
    <aside className="sticky top-0 flex h-screen w-20 shrink-0 flex-col items-center bg-sidebar py-5">
      <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-accent-from to-accent-to text-white shadow-md shadow-black/30">
        <Activity className="size-7" strokeWidth={2} />
      </div>

      <nav className="flex w-full flex-1 flex-col items-center gap-1">
        {navItems
          .filter((item) => !item.permission || can(guardian, item.permission))
          .map(({ label, icon: Icon, to }) => (
            <Link
              key={label}
              to={to}
              aria-label={label}
              title={label}
              className={itemClass}
              activeOptions={{ exact: true }}
              activeProps={{ className: activeClass }}
            >
              <Icon className="size-6" strokeWidth={1.5} />
            </Link>
          ))}
      </nav>

      <div className="flex w-full flex-col items-center gap-3 text-center">
        <div
          title={`${guardian.codename} (${guardian.roleName})`}
          className="flex size-10 items-center justify-center rounded-full border border-line bg-white text-sm font-semibold text-fg"
        >
          {guardian.codename.slice(0, 2).toUpperCase()}
        </div>
        <span className="px-1 text-[10px] uppercase tracking-wider text-white/60">
          {guardian.roleName}
        </span>
        <button
          type="button"
          onClick={onLogout}
          aria-label="Log out"
          title="Log out"
          className={itemClass}
        >
          <LogOut className="size-5" strokeWidth={1.75} />
        </button>
      </div>
    </aside>
  )
}
