import { Swords, Trophy, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { MonsterIcon } from '#/components/MonsterIcon.tsx'
import { questRank, type GlitchListItem } from '#/lib/glitch.ts'
import { answerFightPuzzle, getFightPuzzle, type FightPuzzle } from '#/lib/glitches.functions.ts'

/**
 * The fight: a code spell as hard as the quest rank. Work out the value of one variable;
 * right slays the monster, wrong lets it strike back (a short wait, then a new spell).
 */
export function FightDialog({
  glitch,
  onClose,
  onSlain,
}: {
  glitch: GlitchListItem
  onClose: () => void
  onSlain: () => Promise<void> | void
}) {
  const [puzzle, setPuzzle] = useState<FightPuzzle | null>(null)
  const [answer, setAnswer] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [slain, setSlain] = useState<number | null>(null)
  const input = useRef<HTMLInputElement>(null)

  async function load() {
    setError(null)
    setAnswer('')
    try {
      const p = await getFightPuzzle({ data: { glitchId: glitch.glitchId } })
      setPuzzle(p)
      setRetryAt(p.retryAt)
      setTimeout(() => input.current?.focus(), 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The monster fled – try again')
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [glitch.glitchId])

  // Countdown while the monster strikes back.
  useEffect(() => {
    if (!retryAt) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [retryAt])
  const waiting = retryAt !== null && retryAt > now

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!puzzle || waiting) return
    setPending(true)
    setError(null)
    try {
      const result = await answerFightPuzzle({ data: { glitchId: glitch.glitchId, seed: puzzle.seed, answer: Number(answer) } })
      if (result.slain) {
        setSlain(result.reward)
        await onSlain()
      } else {
        setRetryAt(result.retryAt)
        setNow(Date.now())
        setPuzzle(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  // Portal to <body>: a hovered quest poster is transformed, which would trap a fixed child
  // inside it (the dialog jumps when the poster loses hover, and flickers).
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fight-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-md flex-col gap-4 rounded-sm border border-[#C9A24B] bg-[#FAF7EF] p-5 text-[#101D38] shadow-[inset_0_0_0_3px_#FAF7EF,inset_0_0_0_4px_rgb(201_162_75/0.5),0_20px_50px_rgb(0_0_0/0.5)]"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-sm border border-[#C9A24B] bg-[#101D38]">
            <MonsterIcon monsterId={glitch.monsterId} className="size-12" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-widest text-[#8A6A2A] uppercase">
              Fight · rank {questRank(glitch.locationDanger)}
            </p>
            <h2 id="fight-title" className="text-xl leading-tight font-bold">
              {glitch.monsterName}
            </h2>
            <p className="text-xs text-[#101D38]/60">{glitch.locationName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>

        {slain !== null ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Trophy className="size-10 text-[#C9A24B]" />
            <p className="text-2xl font-black">Monster slain!</p>
            <p className="text-sm">Every party member collects {slain} gold.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-md bg-[#101D38] px-4 py-2 text-sm font-bold text-[#FAF7EF] hover:bg-[#1c2c52]"
            >
              Back to the map
            </button>
          </div>
        ) : waiting ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <p className="text-4xl">💥</p>
            <p className="text-lg font-black text-[#B3263E]">Wrong spell – the monster strikes back!</p>
            <p className="text-sm">Catch your breath: {Math.ceil((retryAt! - now) / 1000)} s</p>
          </div>
        ) : puzzle ? (
          <form onSubmit={onSubmit} className="flex flex-col gap-3">
            <p className="text-sm">
              Cast the spell: what is the value of{' '}
              <code className="rounded bg-[#101D38] px-1.5 py-0.5 font-mono text-[#39C3D6]">{puzzle.ask}</code> at the end?
            </p>
            <pre className="overflow-x-auto rounded-sm border border-[#C9A24B]/60 bg-[#0A1328] p-3 font-mono text-sm leading-relaxed text-[#E9E2CF]">
              {puzzle.code}
            </pre>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <span className="font-mono">{puzzle.ask} =</span>
              <input
                ref={input}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                inputMode="numeric"
                required
                pattern="-?[0-9]+"
                aria-label={`Value of ${puzzle.ask}`}
                className="w-28 rounded-md border-2 border-[#101D38]/25 bg-white px-3 py-1.5 font-mono outline-none focus:border-[#B3263E]"
              />
              <button
                type="submit"
                disabled={pending || !answer.trim()}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-[#B3263E] px-4 py-2 font-bold text-white hover:bg-[#9a1f35] disabled:opacity-60"
              >
                <Swords className="size-4" /> {pending ? '…' : 'Strike!'}
              </button>
            </label>
          </form>
        ) : (
          !error && (
            <button
              type="button"
              onClick={load}
              className="self-center rounded-md bg-[#101D38] px-4 py-2 text-sm font-bold text-[#FAF7EF] hover:bg-[#1c2c52]"
            >
              {retryAt ? 'Try a new spell' : 'Summoning the spell…'}
            </button>
          )
        )}

        {error && (
          <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
