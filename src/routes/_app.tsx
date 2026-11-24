import { Link, Outlet, createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { Siren, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Sidebar } from '#/components/layout/Sidebar.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { getThreats } from '#/lib/glitches.functions.ts'
import { resilient } from '#/lib/polling.ts'
import { SHORTCUTS, useShortcuts } from '#/lib/shortcuts.ts'
import { useTheme } from '#/lib/theme.ts'

/** Layout for every page that needs a logged-in guardian. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => {
    if (!context.guardian) throw redirect({ to: '/login' })
    // Narrowed: child routes get a non-null guardian.
    return { guardian: context.guardian }
  },
  // Re-runs with every poll of the page below it, so lockdown starts and ends live.
  loader: resilient(() => getThreats()),
  component: AppLayout,
})

function AppLayout() {
  const { guardian } = Route.useRouteContext()
  const threats = Route.useLoaderData()
  const router = useRouter()
  const { theme, toggle } = useTheme()
  const [help, setHelp] = useState(false)
  const lockdown = threats.length > 0

  // Lockdown recolours the whole app (see styles.css).
  useEffect(() => {
    if (lockdown) document.documentElement.dataset.lockdown = ''
    else delete document.documentElement.dataset.lockdown
    return () => {
      delete document.documentElement.dataset.lockdown
    }
  }, [lockdown])

  const go = (to: '/' | '/quests' | '/report' | '/bestiary' | '/chronicle') => () => {
    setHelp(false)
    router.navigate({ to })
  }
  useShortcuts({
    m: go('/'),
    q: go('/quests'),
    b: go('/bestiary'),
    c: go('/chronicle'),
    ...(can(guardian, PERMISSIONS.echoCreate) ? { n: go('/report') } : {}),
    d: toggle,
    '?': () => setHelp((h) => !h),
    Escape: (e) => {
      if (!help) return
      e.stopImmediatePropagation()
      setHelp(false)
    },
  })

  return (
    <div className="flex min-h-screen">
      <Sidebar guardian={guardian} theme={theme} onToggleTheme={toggle} onShowHelp={() => setHelp(true)} />
      <main className="min-w-0 flex-1 px-6 py-8 md:px-16 md:py-10 print:p-0">
        <Outlet />
      </main>

      {lockdown && (
        <>
          <div className="lockdown-vignette print-hidden pointer-events-none fixed inset-0 z-40" aria-hidden />
          <div
            role="alert"
            className="print-hidden fixed top-3 left-1/2 z-50 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-[#e11d48] py-1.5 pr-2 pl-3 text-sm font-semibold text-white shadow-lg shadow-red-900/40"
          >
            <Siren className="size-4 shrink-0 motion-safe:animate-pulse" />
            <span className="truncate">
              LOCKDOWN · {threats[0].monsterName} at {threats[0].locationName}
              {threats.length > 1 ? ` (+${threats.length - 1} more)` : ''}
            </span>
            <Link
              to="/glitches/$glitchId"
              params={{ glitchId: threats[0].glitchId }}
              className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs hover:bg-white/30"
            >
              View quest
            </Link>
          </div>
        </>
      )}

      {help && <ShortcutHelp onClose={() => setHelp(false)} />}
    </div>
  )
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="print-hidden fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-title"
        className="w-full max-w-md rounded-2xl border border-line bg-card p-6 text-fg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="shortcut-title" className="text-lg font-semibold">
            Keyboard shortcuts
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-subtle">
            <X className="size-4" />
          </button>
        </div>
        <dl className="flex flex-col gap-2 text-sm">
          {SHORTCUTS.map((s) => (
            <div key={s.label} className="flex items-center justify-between gap-4">
              <dt>
                {s.label} <span className="text-xs text-muted">· {s.where}</span>
              </dt>
              <dd className="flex gap-1">
                {s.keys.map((k) => (
                  <kbd key={k} className="min-w-6 rounded-md border border-line bg-subtle px-1.5 py-0.5 text-center text-xs font-semibold">
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
