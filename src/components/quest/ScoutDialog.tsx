import { Search, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { MonsterIcon } from '#/components/MonsterIcon.tsx'
import { questRank, type GlitchListItem } from '#/lib/glitch.ts'
import { getScoutClue, investigateQuest, type ScoutClue } from '#/lib/glitches.functions.ts'

/**
 * Investigate a scouting quest: a monster's silhouette lurks in the shadows; pick the matching
 * monster out of three. Which monster it is was rolled on the server (dangerous ones are rare).
 */
export function ScoutDialog({
  glitch,
  onClose,
  onFound,
}: {
  glitch: GlitchListItem
  onClose: () => void
  onFound: () => Promise<void> | void
}) {
  const [clue, setClue] = useState<ScoutClue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [retryAt, setRetryAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [miss, setMiss] = useState<string | null>(null)
  const [found, setFound] = useState<{ name: string; monsterId: string; rank: number; reward: number } | null>(null)

  useEffect(() => {
    getScoutClue({ data: { glitchId: glitch.glitchId } })
      .then((c) => {
        setClue(c)
        setRetryAt(c.retryAt)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'The trail went cold'))
  }, [glitch.glitchId])

  // Countdown after a wrong pick.
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

  async function pick(monsterId: string) {
    if (!clue || waiting || pending) return
    setPending(monsterId)
    setError(null)
    try {
      const result = await investigateQuest({ data: { glitchId: glitch.glitchId, monsterId } })
      if (result.ok) {
        setFound({ name: result.monsterName, monsterId: result.monsterId, rank: result.rank, reward: result.reward })
        await onFound()
      } else {
        setMiss(monsterId)
        setRetryAt(result.retryAt)
        setNow(Date.now())
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(null)
    }
  }

  // Portal to <body>, like the fight: a hovered quest poster would otherwise trap it.
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="scout-title"
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-lg flex-col gap-4 rounded-sm border border-[#C9A24B] bg-[#FAF7EF] p-5 text-[#101D38] shadow-[inset_0_0_0_3px_#FAF7EF,inset_0_0_0_4px_rgb(201_162_75/0.5),0_20px_50px_rgb(0_0_0/0.5)]"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold tracking-widest text-[#1E6F7C] uppercase">Investigate · {glitch.glitchId}</p>
            <h2 id="scout-title" className="text-xl leading-tight font-bold">
              {found ? `It's a ${found.name}!` : 'What lurks in the shadows?'}
            </h2>
            <p className="text-xs text-[#101D38]/60">
              {glitch.locationName} · {glitch.villagerReports} villager reports
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>

        {/* The silhouette: the monster drawn in pure shadow on a moonlit night (in colour once found). */}
        <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-sm border border-[#C9A24B]/60 bg-[radial-gradient(circle_at_50%_40%,#2B3D62,#101D38_60%,#0A1328)]">
          <span className="absolute top-4 right-6 size-8 rounded-full bg-[#E9E2CF]/80 shadow-[0_0_30px_8px_rgb(233_226_207/0.25)]" aria-hidden />
          {clue ? (
            <MonsterIcon
              monsterId={found?.monsterId ?? clue.silhouette}
              className={`size-36 transition duration-700 ${found ? '' : 'brightness-0 drop-shadow-[0_0_10px_rgb(57_195_214/0.5)]'}`}
            />
          ) : (
            !error && <p className="text-sm text-[#E9E2CF]/70">Following the tracks…</p>
          )}
        </div>

        {found ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-sm">
              Rank <b>{questRank(found.rank)}</b> monster. You earn <b>{found.reward} gold</b> for scouting; the guild master now sets
              the reward for slaying it.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-1 rounded-md bg-[#101D38] px-4 py-2 text-sm font-bold text-[#FAF7EF] hover:bg-[#1c2c52]"
            >
              Back to the guild
            </button>
          </div>
        ) : (
          clue && (
            <>
              <p className="text-sm">
                {waiting ? (
                  <span className="font-bold text-[#B3263E]">
                    Wrong trail – the shadow slipped away. Look again in {Math.ceil((retryAt! - now) / 1000)} s
                  </span>
                ) : (
                  'Which monster matches the silhouette?'
                )}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {clue.options.map((o) => (
                  <button
                    key={o.monsterId}
                    type="button"
                    onClick={() => pick(o.monsterId)}
                    disabled={waiting || pending !== null}
                    className={`flex flex-col items-center gap-1 rounded-md border-2 bg-white p-2 text-sm font-bold transition hover:-translate-y-0.5 hover:border-[#C9A24B] disabled:translate-y-0 disabled:opacity-50 ${
                      miss === o.monsterId && waiting ? 'border-[#B3263E]' : 'border-[#101D38]/15'
                    }`}
                  >
                    <span className="flex size-16 items-center justify-center rounded-sm bg-[#101D38]">
                      <MonsterIcon monsterId={o.monsterId} className="size-14" />
                    </span>
                    {o.name}
                  </button>
                ))}
              </div>
            </>
          )
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
        {!found && (
          <p className="flex items-center gap-1 text-xs text-[#101D38]/60">
            <Search className="size-3.5" /> The more dangerous a monster, the rarer it shows up.
          </p>
        )}
      </div>
    </div>,
    document.body,
  )
}
