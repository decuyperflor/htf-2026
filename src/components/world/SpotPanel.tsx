import { Eye, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MonsterIcon } from '#/components/MonsterIcon.tsx'
import { Button } from '#/components/ui/Button.tsx'
import type { Location, Monster } from '#/lib/glitch.ts'
import { reportEcho } from '#/lib/glitches.functions.ts'

/** Spot a monster right where you clicked on the map. */
export function SpotPanel({
  location,
  regionName,
  monsters,
  onClose,
  onSpotted,
}: {
  location: Location
  regionName: string
  monsters: Monster[]
  onClose: () => void
  onSpotted: (glitchId: string) => Promise<void> | void
}) {
  const [monsterId, setMonsterId] = useState(monsters[0]?.monsterId ?? 'slime')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      const { glitchId } = await reportEcho({ data: { description, monsterId, locationId: location.locationId } })
      await onSpotted(glitchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report the sighting')
      setPending(false)
    }
  }

  return (
    <aside className="absolute top-4 right-4 bottom-4 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-y-auto rounded-2xl border-2 border-[#2b2340] bg-[#fffaf0] p-4 text-[#2b2340] shadow-xl">
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#b8862f] uppercase">Spot a monster</span>
            <h3 className="text-lg leading-tight font-bold">{location.name}</h3>
            <p className="text-xs text-[#2b2340]/60">{regionName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-semibold">Which monster did you see?</legend>
          <div className="grid grid-cols-3 gap-1.5">
            {monsters.map((m) => {
              const on = monsterId === m.monsterId
              return (
                <label
                  key={m.monsterId}
                  className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-xl border-2 p-1.5 text-center text-[11px] leading-tight font-semibold transition has-focus-visible:ring-2 has-focus-visible:ring-[#a8321e] ${
                    on ? 'border-[#a8321e] bg-[#a8321e]/10' : 'border-[#2b2340]/15 bg-white hover:border-[#2b2340]/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="monster"
                    value={m.monsterId}
                    checked={on}
                    onChange={() => setMonsterId(m.monsterId)}
                    className="sr-only"
                  />
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[#120c2e]">
                    <MonsterIcon monsterId={m.monsterId} className="size-9" />
                  </span>
                  {m.name}
                </label>
              )
            })}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1 text-sm font-semibold">
          What did you observe?
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            maxLength={1000}
            rows={3}
            autoFocus
            placeholder="e.g. The bridge planks keep swapping places"
            className="rounded-lg border-2 border-[#2b2340]/20 bg-white px-3 py-2 font-normal outline-none focus:border-[#a8321e]"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending || !description.trim()} className="mt-auto">
          <Eye className="size-4" /> {pending ? 'Reporting…' : 'Report monster'}
        </Button>
      </form>
    </aside>
  )
}
