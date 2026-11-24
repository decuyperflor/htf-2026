import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { GuildNotice, NoticeButton, NoticeError, NoticeField, NoticeLink } from '#/components/auth/GuildNotice.tsx'
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
    <GuildNotice
      title="Guild sign-in"
      subtitle="Show your codename at the guild gate"
      onSubmit={onSubmit}
      footer={
        <>
          New in Achrona? <NoticeLink to="/register">Join the guild</NoticeLink>
        </>
      }
    >
      <NoticeField label="Codename" name="codename" autoComplete="username" required autoFocus />
      <NoticeField label="Password" name="password" type="password" autoComplete="current-password" required />
      {error && <NoticeError>{error}</NoticeError>}
      <NoticeButton pending={pending}>{pending ? 'Opening the gate…' : 'Enter the guild hall'}</NoticeButton>
    </GuildNotice>
  )
}
