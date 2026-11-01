/**
 * Demo store. Holds mock data only and persists it to localStorage (non-sensitive demo data).
 * Production replaces this module with API calls; UI components should not care which.
 */
import { useSyncExternalStore } from 'react'
import { run, sweep, type Cmd } from '../domain/engine'
import { parseStoredState } from '../domain/stateShape'
import type { CommandResult, DemoState } from '../domain/types'
import { createSeed, DEMO_STATE_VERSION } from '../mock/seed'

const KEY = 'bbp-demo-state-v1'
const listeners = new Set<() => void>()

const load = (): DemoState => {
  try {
    const parsed = parseStoredState(localStorage.getItem(KEY), DEMO_STATE_VERSION)
    if (parsed) return parsed
  } catch {
    /* storage disabled → reseed */
  }
  /* missing, corrupted, old-version or wrong-shaped demo data → reseed */
  return createSeed(Date.now())
}

let state: DemoState = load()

const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* storage full or disabled: demo keeps working in memory */
  }
}

const emit = () => {
  persist()
  listeners.forEach((l) => l())
}

/** Demo clock = device time + test offset. Production must use server time. */
export const nowMs = () => Date.now() + state.clockOffsetMs

export const getState = () => state

export const setState = (fn: (s: DemoState) => DemoState) => {
  const next = fn(state)
  if (next !== state) {
    state = next
    emit()
  }
}

export const dispatch = (cmd: Cmd, idempotencyKey: string | null = null): CommandResult => {
  const { state: next, result } = run(state, nowMs(), idempotencyKey, cmd)
  if (next !== state) {
    state = next
    emit()
  }
  return result
}

export const resetDemo = () => {
  state = createSeed(Date.now())
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Whole demo state (stable reference until it changes). Derive values in the component. */
export function useDemo(): DemoState {
  return useSyncExternalStore(subscribe, getState)
}

// ---- ticking clock: drives countdowns and runs the deadline sweep ----
let tick = nowMs()
const tickListeners = new Set<() => void>()
const runTick = () => {
  tick = nowMs()
  const swept = sweep(state, tick)
  if (swept !== state) {
    state = swept
    emit()
  }
  tickListeners.forEach((l) => l())
}
if (typeof window !== 'undefined') {
  window.setInterval(runTick, 1000)
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      state = load()
      listeners.forEach((l) => l())
    }
  })
}

export const advanceClock = (ms: number) => {
  if (ms <= 0) return
  state = { ...state, clockOffsetMs: state.clockOffsetMs + ms }
  emit()
  runTick()
}

export function useNow(): number {
  return useSyncExternalStore(
    (l) => {
      tickListeners.add(l)
      listeners.add(l)
      return () => {
        tickListeners.delete(l)
        listeners.delete(l)
      }
    },
    () => tick,
  )
}

export const useCurrentUser = () => {
  const s = useDemo()
  return s.users.find((u) => u.id === s.currentUserId) ?? null
}
