import { Link, Outlet, createFileRoute, redirect, useRouter, useRouterState } from '@tanstack/react-router'
import { ShieldOff, Siren, WifiOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Sidebar } from '#/components/layout/Sidebar.tsx'
import { QuestDialogHost } from '#/components/quest/QuestDialogHost.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'
import { getThreats } from '#/lib/glitches.functions.ts'
import { resilient, useOffline } from '#/lib/polling.ts'
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
  const offline = useOffline()
  // An adventurer may decline a quest that is too strong for them: that threat no
  // longer sounds the alarm for them (remembered per guardian, in this browser).
  const declineKey = `achrona-declined-${guardian.guardianId}`
  const [declined, setDeclined] = useState<string[]>([])
  useEffect(() => {
    try {
      setDeclined(JSON.parse(localStorage.getItem(declineKey) ?? '[]'))
    } catch {
      setDeclined([])
    }
  }, [declineKey])
  function decline(glitchId: string) {
    const next = [...declined, glitchId]
    setDeclined(next)
    try {
      localStorage.setItem(declineKey, JSON.stringify(next))
    } catch {
      // Private mode: only for this visit.
    }
  }
  const alarms = threats.filter((t) => !declined.includes(t.glitchId))
  const lockdown = alarms.length > 0
  // The map and the quest board bring their own surface; every other page is a
  // parchment sheet pinned to the guild wall.
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const ownSurface = pathname === '/' || pathname === '/quests'

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
    <div id="app-root" className="flex min-h-screen">
      <Sidebar guardian={guardian} theme={theme} onToggleTheme={toggle} onShowHelp={() => setHelp(true)} />
      <main className="min-w-0 flex-1 px-6 py-8 md:px-16 md:py-10 print:p-0">
        {ownSurface ? (
          <Outlet />
        ) : (
          <div className="paper-sheet mx-auto max-w-6xl px-6 py-8 md:px-10 md:py-10">
            <Outlet />
          </div>
        )}
      </main>
      <QuestDialogHost />

      {lockdown && (
        <>
          <div className="lockdown-vignette print-hidden pointer-events-none fixed inset-0 z-40" aria-hidden />
          <div
            role="alert"
            className="print-hidden fixed top-3 left-1/2 z-50 flex max-w-[calc(100%-7rem)] -translate-x-1/2 items-center gap-2 rounded-full bg-[#e11d48] py-1.5 pr-2 pl-3 text-sm font-semibold text-white shadow-lg shadow-red-900/40"
          >
            <Siren className="size-4 shrink-0 motion-safe:animate-pulse" />
            <span className="truncate">
              LOCKDOWN · {alarms[0].monsterName} at {alarms[0].locationName}
              {alarms.length > 1 ? ` (+${alarms.length - 1} more)` : ''}
            </span>
            <Link
              to="/"
              search={{ quest: alarms[0].glitchId }}
              className="shrink-0 rounded-full bg-white/20 px-2.5 py-0.5 text-xs hover:bg-white/30"
            >
              View quest
            </Link>
            <button
              type="button"
              onClick={() => decline(alarms[0].glitchId)}
              title="This monster is too strong for you: stop the alarm for this quest"
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-black/25 px-2.5 py-0.5 text-xs hover:bg-black/40"
            >
              <ShieldOff className="size-3.5" /> Decline – too strong
            </button>
          </div>
        </>
      )}

      {offline && (
        <div
          role="status"
          className="print-hidden fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#C9A24B] bg-[#101D38] py-1.5 pr-4 pl-3 text-sm font-semibold text-[#E9E2CF] shadow-lg"
        >
          <WifiOff className="size-4 shrink-0 text-[#E3C47A]" />
          Offline – lost contact with the guild hall. Showing the last known state, reconnecting…
        </div>
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
        className="w-full max-w-md rounded-md border border-line bg-card p-6 text-fg shadow-2xl"
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
