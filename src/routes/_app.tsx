import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { Sidebar } from '#/components/layout/Sidebar.tsx'

/** Layout for every page that needs a logged-in guardian. */
export const Route = createFileRoute('/_app')({
  beforeLoad: ({ context }) => {
    if (!context.guardian) throw redirect({ to: '/login' })
    // Narrowed: child routes get a non-null guardian.
    return { guardian: context.guardian }
  },
  component: AppLayout,
})

function AppLayout() {
  const { guardian } = Route.useRouteContext()
  return (
    <div className="flex min-h-screen">
      <Sidebar guardian={guardian} />
      <main className="min-w-0 flex-1 px-6 py-8 md:px-16 md:py-10">
        <Outlet />
      </main>
    </div>
  )
}
