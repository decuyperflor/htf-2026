import { Eye, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MonsterIcon } from '#/components/MonsterIcon.tsx'
import { Button } from '#/components/ui/Button.tsx'
import type { GlitchListItem, Location, Monster } from '#/lib/glitch.ts'
import { investigateQuest, reportEcho } from '#/lib/glitches.functions.ts'

/**
 * Spot a monster right where you clicked on the map, or (with `investigate`) find out
 * which monster is behind a scouting quest's villager reports.
 */
export function SpotPanel({
  location,
  regionName,
  monsters,
  investigate,
  onClose,
  onSpotted,
}: {
  location: Location
  regionName: string
  monsters: Monster[]
  investigate?: GlitchListItem
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
      if (investigate) {
        await investigateQuest({ data: { glitchId: investigate.glitchId, monsterId, description } })
        await onSpotted(investigate.glitchId)
      } else {
        const { glitchId } = await reportEcho({ data: { description, monsterId, locationId: location.locationId } })
        await onSpotted(glitchId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report the sighting')
      setPending(false)
    }
  }

  return (
    <aside className="absolute top-4 right-4 bottom-4 flex w-80 max-w-[calc(100%-2rem)] flex-col overflow-y-auto rounded-sm border border-[#C9A24B] bg-[#FAF7EF] p-4 text-[#101D38] shadow-[inset_0_0_0_3px_#FAF7EF,inset_0_0_0_4px_rgb(201_162_75/0.5),0_10px_30px_rgb(0_0_0/0.4)]">
      <form onSubmit={onSubmit} className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <span className="text-xs font-bold tracking-widest text-[#8A6A2A] uppercase">
              {investigate ? `Investigate · ${investigate.glitchId}` : 'Spot a monster'}
            </span>
            <h3 className="text-lg leading-tight font-bold">{location.name}</h3>
            <p className="text-xs text-[#101D38]/60">{regionName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 hover:bg-black/5">
            <X className="size-4" />
          </button>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-sm font-semibold">
            {investigate ? `${investigate.villagerReports} villagers reported trouble here. Which monster did you find?` : 'Which monster did you see?'}
          </legend>
          <div className="grid grid-cols-3 gap-1.5">
            {monsters.map((m) => {
              const on = monsterId === m.monsterId
              return (
                <label
                  key={m.monsterId}
                  className={`flex cursor-pointer flex-col items-center gap-0.5 rounded-md border-2 p-1.5 text-center text-[11px] leading-tight font-semibold transition has-focus-visible:ring-2 has-focus-visible:ring-[#B3263E] ${
                    on ? 'border-[#B3263E] bg-[#B3263E]/10' : 'border-[#101D38]/15 bg-white hover:border-[#101D38]/40'
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
                  <span className="flex size-10 items-center justify-center rounded-lg bg-[#101D38]">
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
            className="rounded-lg border-2 border-[#101D38]/20 bg-white px-3 py-2 font-normal outline-none focus:border-[#B3263E]"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <Button type="submit" disabled={pending || !description.trim()} className="mt-auto">
          <Eye className="size-4" /> {pending ? 'Reporting…' : investigate ? 'Report what I found · +25 gold' : 'Report monster'}
        </Button>
      </form>
    </aside>
  )
}
