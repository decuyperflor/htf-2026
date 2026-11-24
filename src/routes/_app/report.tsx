import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { EchoForm } from '#/components/EchoForm.tsx'
import { PERMISSIONS, can } from '#/lib/auth.ts'

export const Route = createFileRoute('/_app/report')({
  beforeLoad: ({ context }) => {
    if (!can(context.guardian, PERMISSIONS.echoCreate)) throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: 'Report echo · Control Center' }] }),
  component: ReportPage,
})

function ReportPage() {
  const router = useRouter()

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-fg">Report an echo</h1>
        <p className="mt-2 text-muted">
          Every echo you report opens a new glitch with status LEAKED.
        </p>
      </div>
      <EchoForm
        onReported={(glitchId) =>
          router.navigate({ to: '/glitches/$glitchId', params: { glitchId } })
        }
      />
    </div>
  )
}
