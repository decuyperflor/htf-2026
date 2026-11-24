import { useEffect, useRef } from 'react'

/** Every shortcut in the app, shown in the help overlay (press ?). */
export const SHORTCUTS: { keys: string[]; label: string; where: string }[] = [
  { keys: ['m'], label: 'World map', where: 'Anywhere' },
  { keys: ['q'], label: 'Quest board', where: 'Anywhere' },
  { keys: ['n'], label: 'Spot a new monster', where: 'Anywhere' },
  { keys: ['b'], label: 'Bestiary', where: 'Anywhere' },
  { keys: ['c'], label: 'Chronicle (PDF report)', where: 'Anywhere' },
  { keys: ['d'], label: 'Toggle dark mode', where: 'Anywhere' },
  { keys: ['?'], label: 'Show / hide shortcuts', where: 'Anywhere' },
  { keys: ['/'], label: 'Search quests', where: 'Quest board' },
  { keys: ['j', 'k'], label: 'Next / previous quest', where: 'Quest board, quest page' },
  { keys: ['Enter'], label: 'Open the selected quest', where: 'Quest board' },
  { keys: ['u'], label: 'Back to the quest board', where: 'Quest page' },
  { keys: ['Esc'], label: 'Close panel / zoom out', where: 'World map' },
]

/** True while the user is typing, so letters must not trigger shortcuts. */
function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/**
 * Register single-key shortcuts ({ j: () => ..., '/': () => ... }) while the component is mounted.
 * Ignored while typing in a field or when a modifier key (Ctrl, Alt, Cmd) is held.
 */
export function useShortcuts(handlers: Record<string, (e: KeyboardEvent) => void>) {
  const ref = useRef(handlers)
  ref.current = handlers
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return
      const handler = ref.current[e.key]
      if (!handler) return
      e.preventDefault()
      handler(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
