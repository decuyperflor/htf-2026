import { Hourglass, Search, Swords, Trophy } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { openQuestDialog } from '#/components/quest/QuestDialogHost.tsx'
import { PERMISSIONS, can, type SessionGuardian } from '#/lib/auth.ts'
import { questRank, questStage, type GlitchListItem } from '#/lib/glitch.ts'
import { rateQuest, setQuestAccepted } from '#/lib/glitches.functions.ts'

const primary =
  'inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60'

/**
 * What you can do with a quest right now, by stage:
 * scouting → investigate (match the silhouette) · spotted → guild master sets the reward · open → accept ·
 * engaged → fight (party) · slain → done.
 */
export function QuestActions({
  glitch,
  me,
  onChanged,
}: {
  glitch: GlitchListItem
  me: SessionGuardian
  onChanged: () => Promise<void> | void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stage = questStage(glitch)
  const adventurer = can(me, PERMISSIONS.questAccept)
  const guildMaster = can(me, PERMISSIONS.locationManage)
  const onQuest = glitch.assignedGuardianIds.includes(me.guardianId)

  async function run(action: () => Promise<unknown>) {
    setPending(true)
    setError(null)
    try {
      await action()
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setPending(false)
    }
  }
  const accept = (accepted: boolean) => run(() => setQuestAccepted({ data: { glitchId: glitch.glitchId, accepted } }))

  return (
    <div className="flex flex-col gap-2">
      {stage === 'scouting' &&
        (adventurer ? (
          <button type="button" onClick={() => openQuestDialog('scout', glitch)} className={`${primary} bg-[#101D38] text-[#FAF7EF] hover:bg-[#1c2c52]`}>
            <Search className="size-4" /> Investigate · +25 gold
          </button>
        ) : (
          <Note>Waiting for an adventurer to find out which monster is behind the villagers' reports.</Note>
        ))}

      {stage === 'awaiting-rank' &&
        (guildMaster ? (
          <RateForm glitch={glitch} onChanged={onChanged} />
        ) : (
          <Note>The guild master is setting the reward of this quest…</Note>
        ))}

      {(stage === 'open' || stage === 'fighting') && adventurer && (
        <>
          {onQuest && stage === 'fighting' && (
            <button
              type="button"
              onClick={() => openQuestDialog('fight', glitch)}
              className={`${primary} bg-[#B3263E] py-2.5 text-white shadow-[0_2px_0_#7a1526] hover:bg-[#9a1f35]`}
            >
              <Swords className="size-4" /> Fight the {glitch.monsterName}
            </button>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => accept(!onQuest)}
            className={
              onQuest
                ? `${primary} border border-[#101D38]/30 bg-white text-[#101D38] hover:bg-[#101D38]/5`
                : `${primary} bg-[#101D38] text-[#FAF7EF] hover:bg-[#1c2c52]`
            }
          >
            <Swords className="size-4" /> {pending ? '…' : onQuest ? 'Leave quest' : stage === 'open' ? 'Accept quest' : 'Join the fight'}
          </button>
        </>
      )}
      {stage === 'open' && !adventurer && <Note>Open for adventurers: rank {questRank(glitch.locationDanger)}, {glitch.reward} gold each.</Note>}

      {stage === 'slain' && (
        <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-700/20">
          <Trophy className="size-4" /> Quest complete – {glitch.reward} gold paid to the party
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

    </div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md bg-[#101D38]/5 px-3 py-2 text-sm text-[#101D38]/80">
      <Hourglass className="mt-0.5 size-4 shrink-0" /> {children}
    </p>
  )
}

/** Guild master: the reward for a Spotted quest (its rank follows the monster); then adventurers can accept it. */
export function RateForm({ glitch, onChanged }: { glitch: GlitchListItem; onChanged: () => Promise<void> | void }) {
  const [reward, setReward] = useState(glitch.reward)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setPending(true)
    setError(null)
    try {
      await rateQuest({ data: { glitchId: glitch.glitchId, reward } })
      await onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2 rounded-md border border-[#C9A24B]/60 bg-white p-3 text-[#101D38]">
      <p className="flex items-center justify-between gap-2 text-sm font-bold">
        Set the reward
        <span className="rounded-sm bg-[#101D38] px-2 py-0.5 text-xs text-[#E3C47A]" title="The rank follows the monster">
          Rank {questRank(glitch.locationDanger)}
        </span>
      </p>
      <label className="flex items-center gap-2 text-sm">
        Reward
        <input
          type="number"
          min={0}
          max={100000}
          step={10}
          value={reward}
          onChange={(e) => setReward(Number(e.target.value))}
          className="w-24 rounded-md border border-[#101D38]/25 px-2 py-1"
        />
        gold each
      </label>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={pending} className={`${primary} bg-[#B3263E] text-white hover:bg-[#9a1f35]`}>
        {pending ? 'Posting…' : 'Post the quest'}
      </button>
    </form>
  )
}
