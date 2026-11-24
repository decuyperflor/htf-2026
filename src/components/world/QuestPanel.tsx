import { Link } from '@tanstack/react-router'
import { Coins, Swords, Trophy, X } from 'lucide-react'
import { useState } from 'react'
import { DangerStars, MonsterIcon } from '#/components/MonsterIcon.tsx'
import { StatusBadge } from '#/components/StatusBadge.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { PERMISSIONS, can, type SessionGuardian } from '#/lib/auth.ts'
import { questRank, type GlitchListItem } from '#/lib/glitch.ts'
import { completeQuest, setQuestAccepted } from '#/lib/glitches.functions.ts'
import type { GuardianSummary } from '#/lib/guardians.functions.ts'

/** The quest card for a monster: rank, reward, party and the accept button. */
export function QuestPanel({
  glitch,
  me,
  guardians,
  onClose,
  onChanged,
}: {
  glitch: GlitchListItem
  me: SessionGuardian
  guardians: GuardianSummary[]
  onClose: () => void
  onChanged: () => Promise<void> | void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const onQuest = glitch.assignedGuardianIds.includes(me.guardianId)
  const byId = new Map(guardians.map((g) => [g.guardianId, g]))
  const slain = glitch.status === 'FIXED'

  async function toggle() {
    setPending(true)
    setError(null)
    try {
      await setQuestAccepted({ data: { glitchId: glitch.glitchId, accepted: !onQuest } })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  async function complete() {
    setPending(true)
    setError(null)
    try {
      await completeQuest({ data: { glitchId: glitch.glitchId } })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }

  return (
    <aside className="absolute top-4 right-4 bottom-4 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-3 overflow-y-auto rounded-sm border border-[#C9A24B] bg-[#FAF7EF] p-4 text-[#101D38] shadow-[inset_0_0_0_3px_#FAF7EF,inset_0_0_0_4px_rgb(201_162_75/0.5),0_10px_30px_rgb(0_0_0/0.4)]">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold tracking-widest text-[#8A6A2A] uppercase">Quest · {glitch.glitchId}</span>
        <button type="button" onClick={onClose} aria-label="Close quest" className="rounded-full p-1 hover:bg-black/5">
          <X className="size-4" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-sm border border-[#C9A24B] bg-[#101D38]">
          <MonsterIcon monsterId={glitch.monsterId} className="size-14" />
        </div>
        <div className="min-w-0">
          <h3 className="text-lg leading-tight font-bold">{glitch.monsterName}</h3>
          <DangerStars danger={glitch.danger} />
          <div className="mt-1">
            <StatusBadge status={glitch.status} />
          </div>
        </div>
      </div>

      <p className="text-sm">{glitch.description}</p>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-white p-2.5 ring-1 ring-[#101D38]/15">
          <dt className="text-xs text-[#101D38]/60">Quest rank</dt>
          <dd className="text-2xl font-black">{questRank(glitch.locationDanger)}</dd>
        </div>
        <div className="rounded-md bg-white p-2.5 ring-1 ring-[#101D38]/15">
          <dt className="text-xs text-[#101D38]/60">Reward</dt>
          <dd className="flex items-center gap-1 text-2xl font-black text-[#8A6A2A]">
            <Coins className="size-5" /> {glitch.reward}
          </dd>
        </div>
        <div className="col-span-2 rounded-md bg-white p-2.5 ring-1 ring-[#101D38]/15">
          <dt className="text-xs text-[#101D38]/60">Location</dt>
          <dd className="font-semibold">
            {glitch.locationName} <span className="font-normal text-[#101D38]/60">· {glitch.regionName}</span>
          </dd>
        </div>
        <div className="col-span-2 rounded-md bg-white p-2.5 ring-1 ring-[#101D38]/15">
          <dt className="text-xs text-[#101D38]/60">Party ({glitch.assignedGuardianIds.length})</dt>
          <dd className="flex flex-col gap-1 font-semibold">
            {glitch.assignedGuardianIds.length
              ? glitch.assignedGuardianIds.map((id) => {
                  const g = byId.get(id)
                  return (
                    <span key={id} className="flex items-center justify-between gap-2">
                      {g?.codename ?? `#${id}`}
                      <span className={`text-xs font-medium ${g?.online ? 'text-emerald-700' : 'text-[#4A5675]'}`}>
                        {g?.online ? '⚔️ fighting' : '💤 asleep (offline)'}
                      </span>
                    </span>
                  )
                })
              : 'Nobody yet – be the first!'}
          </dd>
        </div>
      </dl>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {slain && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-700/20">
          🏆 Quest complete – {glitch.reward} gold paid to the party
        </p>
      )}

      <div className="mt-auto flex flex-col gap-2">
        {onQuest && !slain && (
          <Button onClick={complete} disabled={pending} className="!bg-emerald-700 hover:!bg-emerald-800">
            <Trophy className="size-4" />
            {pending ? '…' : `Complete quest · claim ${glitch.reward} gold`}
          </Button>
        )}
        {can(me, PERMISSIONS.questAccept) && !slain && (
          <Button onClick={toggle} disabled={pending} variant={onQuest ? 'secondary' : 'primary'} className={onQuest ? '!border-[#101D38]/30 !bg-white !text-[#101D38]' : ''}>
            <Swords className="size-4" />
            {pending ? '…' : onQuest ? 'Leave quest' : 'Accept quest'}
          </Button>
        )}
        <Link
          to="/glitches/$glitchId"
          params={{ glitchId: glitch.glitchId }}
          className="text-center text-sm font-medium text-accent hover:underline"
        >
          Open quest details →
        </Link>
      </div>
    </aside>
  )
}
