import { useRouter } from '@tanstack/react-router'
import { useEffect, useSyncExternalStore } from 'react'

/** How often live pages ask the server for the latest state. */
export const POLL_MS = 3000

/**
 * Live updates: re-run the route loaders every few seconds while the tab is visible.
 * Each poll waits for the previous one, so requests never pile up or get aborted.
 */
export function usePolling() {
  const router = useRouter()
  useEffect(() => {
    let stopped = false
    let timer: ReturnType<typeof setTimeout>
    const tick = async () => {
      if (document.visibilityState === 'visible' && router.state.status !== 'pending') {
        await router.invalidate().catch(() => {})
      }
      if (!stopped) timer = setTimeout(tick, POLL_MS)
    }
    timer = setTimeout(tick, POLL_MS)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [router])
}

/**
 * Wrap a loader so a dropped poll in the browser keeps showing the last good data
 * (the next poll tries again). On the server every request loads fresh data.
 */
export function resilient<T>(load: () => Promise<T>): () => Promise<T> {
  let lastGood: T | null = null
  return async () => {
    if (typeof window === 'undefined') return load()
    try {
      lastGood = await load()
      setOffline(false)
    } catch (err) {
      setOffline(true)
      if (lastGood === null) throw err
    }
    return lastGood
  }
}

// ---------- Connection state: offline as soon as a poll fails, back online with the next success ----------

let offline = false
const listeners = new Set<() => void>()

function setOffline(value: boolean) {
  if (offline === value) return
  offline = value
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  // The browser knows about a dropped network before any poll fails.
  const down = () => setOffline(true)
  window.addEventListener('offline', down)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('offline', down)
  }
}

/** True while the guild hall (server) can't be reached; the page keeps showing the last known data. */
export function useOffline() {
  return useSyncExternalStore(
    subscribe,
    () => offline,
    () => false,
  )
}
