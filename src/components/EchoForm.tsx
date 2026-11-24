import { useState, type FormEvent } from 'react'
import { Button } from '#/components/ui/Button.tsx'
import { reportEcho } from '#/lib/glitches.functions.ts'

type EchoFormProps = {
  /** Add the echo to this glitch; omit to open a new glitch. */
  glitchId?: string
  submitLabel?: string
  onReported: (glitchId: string) => void | Promise<void>
}

export function EchoForm({ glitchId, submitLabel = 'Report echo', onReported }: EchoFormProps) {
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const result = await reportEcho({ data: { description, glitchId } })
      setDescription('')
      await onReported(result.glitchId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not report echo')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm text-fg">
        What did you observe?
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          maxLength={1000}
          rows={4}
          placeholder="e.g. Time loop detected near the eastern clock tower"
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
