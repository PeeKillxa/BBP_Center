import { useEffect, useSyncExternalStore } from 'react'

export type ThemeChoice = 'light' | 'dark' | 'system'
const KEY = 'bbp-theme'
const listeners = new Set<() => void>()
const mq = typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

const read = (): ThemeChoice => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark'
  } catch {
    return 'dark'
  }
}

let choice: ThemeChoice = read()

const apply = () => {
  const dark = choice === 'dark' || (choice === 'system' && !!mq?.matches)
  document.documentElement.classList.toggle('dark', dark)
}

export const setTheme = (t: ThemeChoice) => {
  choice = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* ignore */
  }
  apply()
  listeners.forEach((l) => l())
}

export const useTheme = () => {
  const t = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => choice,
  )
  useEffect(() => {
    apply()
    const onChange = () => choice === 'system' && apply()
    mq?.addEventListener('change', onChange)
    return () => mq?.removeEventListener('change', onChange)
  }, [])
  return t
}
