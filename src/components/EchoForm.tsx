import { useState, type FormEvent } from 'react'
import { DangerStars, MonsterIcon } from '#/components/MonsterIcon.tsx'
import { Button } from '#/components/ui/Button.tsx'
import type { Monster } from '#/lib/glitch.ts'
import { reportEcho } from '#/lib/glitches.functions.ts'

type EchoFormProps = {
  /** Add the sighting to this glitch; omit to spot a new monster. */
  glitchId?: string
  /** The monster index to choose from (only used for a new monster). */
  monsters?: Monster[]
  submitLabel?: string
  onReported: (glitchId: string) => void | Promise<void>
}

export function EchoForm({ glitchId, monsters = [], submitLabel = 'Report sighting', onReported }: EchoFormProps) {
  const [description, setDescription] = useState('')
  const [monsterId, setMonsterId] = useState(monsters[0]?.monsterId ?? 'slime')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const choosingMonster = !glitchId && monsters.length > 0

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const result = await reportEcho({
        data: { description, glitchId, monsterId: choosingMonster ? monsterId : undefined },
      })
      setDescription('')
      await onReported(result.glitchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report sighting')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {choosingMonster && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm text-fg">Which monster did you see?</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {monsters.map((m) => (
              <label
                key={m.monsterId}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-3 text-center text-sm transition-colors has-focus-visible:ring-2 has-focus-visible:ring-accent ${
                  monsterId === m.monsterId ? 'border-accent bg-accent/5' : 'border-line hover:bg-subtle'
                }`}
              >
                <input
                  type="radio"
                  name="monster"
                  value={m.monsterId}
                  checked={monsterId === m.monsterId}
                  onChange={() => setMonsterId(m.monsterId)}
                  className="sr-only"
                />
                <MonsterIcon monsterId={m.monsterId} className="size-14" />
                <span className="font-medium text-fg">{m.name}</span>
                <DangerStars danger={m.danger} />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <label className="flex flex-col gap-1.5 text-sm text-fg">
        What did you observe?
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={1000}
          rows={4}
          placeholder="e.g. Something is making the eastern clock tower ring nonstop"
          className="rounded-lg border border-line px-3 py-2 outline-none focus:border-accent"
        />
      </label>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div>
        <Button type="submit" disabled={pending || !description.trim()}>
          {pending ? 'Sending…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
