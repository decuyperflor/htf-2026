import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { getSession } from '#/lib/auth.functions.ts'
import { resilient } from '#/lib/polling.ts'
import { THEME_BOOT_SCRIPT } from '#/lib/theme.ts'

import appCss from '../styles.css?url'

const loadSession = resilient(() => getSession())

export const Route = createRootRoute({
  // Every route below can read `context.guardian` (null when logged out).
  // Resilient: a poll while the server is unreachable keeps the session we had.
  beforeLoad: async () => ({ guardian: await loadSession() }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Achrona Guild' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: Outlet,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    // The boot script may set data-theme before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <HeadContent />
      </head>
      <body className="bg-app font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
