import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '#/components/ui/Button.tsx'
import { login } from '#/lib/auth.functions.ts'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.guardian) throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: 'Login · Achrona Guild' }] }),
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      await login({
        data: {
          codename: String(form.get('codename') ?? ''),
          password: String(form.get('password') ?? ''),
        },
      })
      // Re-run the root beforeLoad so the new session is picked up.
      await router.invalidate()
      await router.navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
      setPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar px-4">
      <form
        onSubmit={onSubmit}
        className="flex w-full max-w-sm flex-col gap-5 rounded-3xl bg-panel p-8 shadow-xl shadow-black/30"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-linear-to-br from-accent-from to-accent-to text-white">
            <Activity className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-fg">Guardians of the Grid</h1>
            <p className="text-sm text-muted">Enter the guild hall of Achrona</p>
          </div>
        </div>

        <label className="flex flex-col gap-1.5 text-sm text-fg">
          Codename
          <input
            name="codename"
            autoComplete="username"
            required
            autoFocus
            className="rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-fg">
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending}>
          {pending ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </div>
  )
}
