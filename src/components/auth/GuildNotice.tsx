import { Link } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import { GuildEmblem } from '#/components/GuildEmblem.tsx'
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'

/**
 * Login and register share this look: a parchment notice pinned to the guild's
 * cork board, sealed with red wax. Colours are fixed (parchment stays parchment
 * in dark mode, like the quest posters).
 */
export function GuildNotice({
  title,
  subtitle,
  onSubmit,
  children,
  footer,
}: {
  title: string
  subtitle: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="flex min-h-screen p-3 sm:p-6">
      <div className="quest-board flex w-full items-center justify-center rounded-md px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="parchment relative flex w-full max-w-sm -rotate-1 flex-col gap-4 px-8 pt-10 pb-8"
        >
          {/* Pin */}
          <span
            aria-hidden
            className="absolute -top-2 left-1/2 size-5 -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_35%_35%,#ff8a8a,#b3261e)] shadow-[0_3px_4px_rgb(0_0_0/0.4)]"
          />
          <div className="flex flex-col items-center gap-1.5 text-center">
            <GuildEmblem className="mb-1 h-28 w-24 drop-shadow-[0_4px_6px_rgb(40_20_0/0.35)]" />
            <p className="font-display text-sm font-bold tracking-[0.25em] text-[#101D38] uppercase">
              Guardians of the Grid
            </p>
            <p className="text-[11px] font-semibold tracking-[0.3em] text-[#B3263E] uppercase">Achrona Guild</p>
            <h1 className="text-2xl font-extrabold text-[#2b1d0e]">{title}</h1>
            <p className="text-sm text-[#6b4e26]">{subtitle}</p>
          </div>
          <div className="mx-auto h-px w-2/3 bg-[#2b1d0e]/20" />
          {children}
          <p className="text-center text-sm text-[#6b4e26]">{footer}</p>
          {/* Wax seal */}
          <span
            aria-hidden
            className="absolute -right-4 -bottom-4 flex size-14 rotate-12 items-center justify-center rounded-full bg-[radial-gradient(circle_at_35%_35%,#d9533f,#8e1f12)] text-[#ffd9c9] shadow-[0_3px_6px_rgb(0_0_0/0.35)]"
          >
            <Shield className="size-6" />
          </span>
        </form>
      </div>
    </div>
  )
}

export function NoticeField({
  label,
  hint,
  ...input
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1 text-sm font-semibold text-[#2b1d0e]">
      {label}
      <input
        {...input}
        className="rounded-md border border-[#a8875a] bg-[#fffaf0]/80 px-3 py-2 font-normal text-[#2b1d0e] outline-none focus:border-[#a8321e] focus:ring-2 focus:ring-[#a8321e]/20"
      />
      {hint && <span className="text-xs font-normal text-[#7a5a2e]">{hint}</span>}
    </label>
  )
}

export function NoticeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-[#c9665a] bg-[#f9d9cf] px-3 py-2 text-sm text-[#7a1d10]">
      {children}
    </p>
  )
}

export function NoticeButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 rounded-md bg-[#a8321e] px-4 py-2.5 font-display font-bold tracking-wide text-[#fff1e0] shadow-[0_2px_0_#6e1c10] transition hover:bg-[#932a18] disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export function NoticeLink({ to, children }: { to: '/login' | '/register'; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="font-semibold text-[#a8321e] underline decoration-dotted underline-offset-2 hover:text-[#7a1d10]"
    >
      {children}
    </Link>
  )
}
