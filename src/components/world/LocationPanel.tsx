import { Link } from '@tanstack/react-router'
import { Eye, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '#/components/ui/Button.tsx'
import { questRank, type Location } from '#/lib/glitch.ts'
import { updateLocation } from '#/lib/world.functions.ts'

/** Guild master: set how dangerous a location is and what a quest there pays. */
export function LocationPanel({
  location,
  onClose,
  onChanged,
}: {
  location: Location
  onClose: () => void
  onChanged: () => Promise<void> | void
}) {
  const [danger, setDanger] = useState(location.danger)
  const [reward, setReward] = useState(location.reward)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    setSaved(false)
    try {
      await updateLocation({ data: { locationId: location.locationId, danger, reward } })
      await onChanged()
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setPending(false)
    }
  }

  return (
    <aside className="absolute top-4 right-4 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-3 rounded-2xl border-2 border-[#2b2340] bg-[#fffaf0] p-4 text-[#2b2340] shadow-xl">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-bold tracking-widest text-[#b8862f] uppercase">Location</span>
          <h3 className="text-lg leading-tight font-bold">{location.name}</h3>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-black/5">
          <X className="size-4" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <fieldset className="flex flex-col gap-1.5 text-sm">
          <legend className="mb-1.5">Danger (quest rank)</legend>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((d) => (
              <label
                key={d}
                className={`flex size-10 cursor-pointer items-center justify-center rounded-lg border-2 text-lg font-black has-focus-visible:ring-2 has-focus-visible:ring-accent ${
                  danger === d ? 'border-[#2b2340] bg-[#ffcf4d]' : 'border-[#2b2340]/20 bg-white hover:bg-black/5'
                }`}
              >
                <input type="radio" name="danger" value={d} checked={danger === d} onChange={() => setDanger(d)} className="sr-only" />
                {questRank(d)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5 text-sm">
          Reward per adventurer (gold)
          <input
            type="number"
            min={0}
            max={100000}
            step={10}
            value={reward}
            onChange={(e) => setReward(Number(e.target.value))}
            className="rounded-lg border border-[#2b2340]/30 bg-white px-3 py-2 outline-none focus:border-accent"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && <p className="text-sm text-emerald-700">Saved – every quest here now shows this rank and reward.</p>}
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        <Link
          to="/report"
          search={{ location: location.locationId }}
          className="inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-accent hover:underline"
        >
          <Eye className="size-4" /> Spot a monster here
        </Link>
      </form>
    </aside>
  )
}
