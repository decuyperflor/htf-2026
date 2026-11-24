import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { GuildNotice, NoticeButton, NoticeError, NoticeField, NoticeLink } from '#/components/auth/GuildNotice.tsx'
import { register } from '#/lib/auth.functions.ts'

export const Route = createFileRoute('/register')({
  beforeLoad: ({ context }) => {
    if (context.guardian) throw redirect({ to: '/' })
  },
  head: () => ({ meta: [{ title: 'Join the guild · Achrona Guild' }] }),
  component: RegisterPage,
})

function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    if (password !== String(form.get('confirm') ?? '')) {
      setError('The passwords do not match')
      return
    }
    setPending(true)
    setError(null)
    try {
      await register({ data: { codename: String(form.get('codename') ?? ''), password } })
      // New members are logged in straight away.
      await router.invalidate()
      await router.navigate({ to: '/' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join the guild')
      setPending(false)
    }
  }

  return (
    <GuildNotice
      title="Join the guild"
      subtitle="Sign the register and start as an adventurer"
      onSubmit={onSubmit}
      footer={
        <>
          Already a member? <NoticeLink to="/login">Sign in</NoticeLink>
        </>
      }
    >
      <NoticeField
        label="Codename"
        name="codename"
        autoComplete="username"
        required
        autoFocus
        minLength={3}
        maxLength={20}
        hint="3–20 letters, numbers, - or _"
      />
      <NoticeField
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="At least 8 characters"
      />
      <NoticeField label="Repeat password" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      {error && <NoticeError>{error}</NoticeError>}
      <NoticeButton pending={pending}>{pending ? 'Signing the register…' : 'Sign the register'}</NoticeButton>
    </GuildNotice>
  )
}
