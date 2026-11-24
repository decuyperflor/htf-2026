import { Link, useRouter } from '@tanstack/react-router'
import { GuildEmblem } from '#/components/GuildEmblem.tsx'
import { BookOpen, Coins, Eye, FileText, Keyboard, LogOut, Map as MapIcon, Moon, ScrollText, Sun, type LucideIcon } from 'lucide-react'
import { PERMISSIONS, can, type Permission, type SessionGuardian } from '#/lib/auth.ts'
import { logout } from '#/lib/auth.functions.ts'
import type { Theme } from '#/lib/theme.ts'

type NavItem = {
  label: string
  icon: LucideIcon
  to: '/' | '/quests' | '/report' | '/bestiary' | '/chronicle'
  /** Only shown when the guardian has this permission. */
  permission?: Permission
}

const navItems: NavItem[] = [
  { label: 'World map', icon: MapIcon, to: '/' },
  { label: 'Quest board', icon: ScrollText, to: '/quests' },
  { label: 'Spot a monster', icon: Eye, to: '/report', permission: PERMISSIONS.echoCreate },
  { label: 'Bestiary', icon: BookOpen, to: '/bestiary' },
  { label: 'Chronicle (PDF report)', icon: FileText, to: '/chronicle' },
]

// Icon-only items: the label lives in aria-label/title for screen readers and hover.
const itemClass =
  'flex size-12 items-center justify-center rounded-md text-[#E9E2CF]/70 transition-colors hover:bg-white/5 hover:text-[#E3C47A]'
const activeClass = 'bg-white/5 text-[#E3C47A] ring-1 ring-inset ring-[#C9A24B]/70'

export function Sidebar({
  guardian,
  theme,
  onToggleTheme,
  onShowHelp,
}: {
  guardian: SessionGuardian
  theme: Theme
  onToggleTheme: () => void
  onShowHelp: () => void
}) {
  const router = useRouter()

  async function onLogout() {
    await logout()
    await router.invalidate()
    await router.navigate({ to: '/login' })
  }

  return (
    <aside className="sticky top-0 flex h-screen w-20 shrink-0 flex-col items-center bg-sidebar wood py-5 transition-colors print:hidden">
      <Link to="/" aria-label="Guardians of the Grid – world map" className="mb-6 block drop-shadow-[0_3px_4px_rgb(0_0_0/0.45)]">
        <GuildEmblem className="h-14 w-12" />
      </Link>

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

      <div className="mb-3 flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode (d)' : 'Switch to dark mode (d)'}
          title={theme === 'dark' ? 'Light mode (d)' : 'Dark mode (d)'}
          className={itemClass}
        >
          {theme === 'dark' ? <Sun className="size-5" strokeWidth={1.75} /> : <Moon className="size-5" strokeWidth={1.75} />}
        </button>
        <button type="button" onClick={onShowHelp} aria-label="Keyboard shortcuts (?)" title="Keyboard shortcuts (?)" className={itemClass}>
          <Keyboard className="size-5" strokeWidth={1.75} />
        </button>
      </div>

      <div className="flex w-full flex-col items-center gap-3 text-center">
        <div
          title={`${guardian.codename} (${guardian.roleName})`}
          className="flex size-10 items-center justify-center rounded-full border-2 border-[#C9A24B] bg-[#E9E2CF] font-display text-sm font-bold text-[#101D38] shadow-[0_0_0_1px_#0A1328]"
        >
          {guardian.codename.slice(0, 2).toUpperCase()}
        </div>
        <span className="px-1 text-[10px] uppercase tracking-wider text-[#E9E2CF]/70">
          {guardian.roleName}
        </span>
        {guardian.roleId === 'defender' && (
          <span
            title={`${guardian.gold} gold earned`}
            className="flex items-center gap-1 rounded-full bg-[#E3C47A]/15 px-2 py-0.5 text-xs font-bold text-[#E3C47A]"
          >
            <Coins className="size-3.5" /> {guardian.gold}
          </span>
        )}
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
