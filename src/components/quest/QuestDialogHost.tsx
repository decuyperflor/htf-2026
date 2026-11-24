import { useRouter } from '@tanstack/react-router'
import { useSyncExternalStore } from 'react'
import { FightDialog } from '#/components/quest/FightDialog.tsx'
import { ScoutDialog } from '#/components/quest/ScoutDialog.tsx'
import type { GlitchListItem } from '#/lib/glitch.ts'

/**
 * The investigate and fight dialogs live here, once for the whole app, not inside a quest
 * poster: winning moves the poster to another column (and polling re-renders it), which
 * would otherwise unmount the dialog before you see the result.
 */
type QuestDialog = { kind: 'scout' | 'fight'; glitch: GlitchListItem } | null

let current: QuestDialog = null
const listeners = new Set<() => void>()
function set(next: QuestDialog) {
  current = next
  for (const l of listeners) l()
}

export const openQuestDialog = (kind: 'scout' | 'fight', glitch: GlitchListItem) => set({ kind, glitch })

export function QuestDialogHost() {
  const router = useRouter()
  const dialog = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => null,
  )
  if (!dialog) return null
  const close = () => set(null)
  const refresh = () => router.invalidate()
  return dialog.kind === 'scout' ? (
    <ScoutDialog key={dialog.glitch.glitchId} glitch={dialog.glitch} onClose={close} onFound={refresh} />
  ) : (
    <FightDialog key={dialog.glitch.glitchId} glitch={dialog.glitch} onClose={close} onSlain={refresh} />
  )
}
