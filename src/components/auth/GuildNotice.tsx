import { Link } from '@tanstack/react-router'
import { Shield } from 'lucide-react'
import { GuildEmblem } from '#/components/GuildEmblem.tsx'
import type { FormEvent, InputHTMLAttributes, ReactNode } from 'react'

/**
 * Login and register share this look: a bone-paper notice on the navy chart
 * table, riveted in gold and sealed in crimson. Colours are fixed (the paper stays
 * light in dark mode, like the quest posters).
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
          className="parchment relative flex w-full max-w-sm flex-col gap-4 rounded-sm px-8 pt-10 pb-8"
        >
          {/* Gold rivets, like the studs on the shield */}
          {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos) => (
            <span
              key={pos}
              aria-hidden
              className={`absolute ${pos} size-2.5 rounded-full bg-[radial-gradient(circle_at_35%_35%,#F3DC9A,#C9A24B_55%,#8A6A2A)] shadow-[0_0_0_1px_#101D38]`}
            />
          ))}
          <div className="flex flex-col items-center gap-1.5 text-center">
            <GuildEmblem className="mb-1 h-28 w-24 drop-shadow-[0_4px_6px_rgb(10_19_40/0.35)]" />
            <p className="font-display text-sm font-bold tracking-[0.25em] text-[#101D38] uppercase">
              Guardians of the Grid
            </p>
            <p className="text-[11px] font-semibold tracking-[0.3em] text-[#B3263E] uppercase">Achrona Guild</p>
            <h1 className="text-2xl font-extrabold text-[#101D38]">{title}</h1>
            <p className="text-sm text-[#4A5675]">{subtitle}</p>
          </div>
          <div aria-hidden className="mx-auto flex w-2/3 items-center gap-2">
            <span className="h-px flex-1 bg-[#C9A24B]" />
            <span className="size-1.5 rotate-45 bg-[#B3263E]" />
            <span className="h-px flex-1 bg-[#C9A24B]" />
          </div>
          {children}
          <p className="text-center text-sm text-[#4A5675]">{footer}</p>
          {/* Crimson seal with a gold rim */}
          <span
            aria-hidden
            className="absolute -right-4 -bottom-4 flex size-14 items-center justify-center rounded-full border-2 border-[#C9A24B] bg-[radial-gradient(circle_at_35%_35%,#CF4A5E,#7A1A2B)] text-[#F3DC9A] shadow-[0_0_0_1px_#101D38,0_3px_6px_rgb(0_0_0/0.35)]"
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
    <label className="flex flex-col gap-1 text-sm font-semibold text-[#101D38]">
      {label}
      <input
        {...input}
        className="rounded-md border border-[#B9AD8C] bg-[#FAF7EF]/80 px-3 py-2 font-normal text-[#101D38] outline-none focus:border-[#B3263E] focus:ring-2 focus:ring-[#B3263E]/20"
      />
      {hint && <span className="text-xs font-normal text-[#4A5675]">{hint}</span>}
    </label>
  )
}

export function NoticeError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-md border border-[#c9665a] bg-[#f9d9cf] px-3 py-2 text-sm text-[#7A1A2B]">
      {children}
    </p>
  )
}

export function NoticeButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-1 rounded-md bg-[#B3263E] px-4 py-2.5 font-display font-bold tracking-wide text-[#FAF7EF] shadow-[0_2px_0_#7A1A2B] transition hover:bg-[#9A1F35] disabled:opacity-60"
    >
      {children}
    </button>
  )
}

export function NoticeLink({ to, children }: { to: '/login' | '/register'; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="font-semibold text-[#B3263E] underline decoration-dotted underline-offset-2 hover:text-[#7A1A2B]"
    >
      {children}
    </Link>
  )
}
