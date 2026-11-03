import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, type Catalog, type User } from './api'

type Session = { user: User | null; providers: string[] }
const Store = createContext<{
  session: Session
  catalog: Catalog | null
  loading: boolean
  error: string
  reload: () => Promise<void>
} | null>(null)
export function ShopProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>({ user: null, providers: [] })
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    try {
      const [nextSession, nextCatalog] = await Promise.all([api<Session>('/auth/session'), api<Catalog>('/catalog')])
      setSession(nextSession)
      setCatalog(nextCatalog)
      setError('')
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void reload()
  }, [reload])
  return <Store.Provider value={{ session, catalog, loading, error, reload }}>{children}</Store.Provider>
}
export function useShop() {
  const store = useContext(Store)
  if (!store) throw new Error('Missing shop context')
  return store
}
export function useRemote<T>(path: string) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const reload = useCallback(async () => {
    try {
      setData(await api<T>(path))
      setError('')
    } catch (failure) {
      setError((failure as Error).message)
    }
  }, [path])
  useEffect(() => {
    void reload()
  }, [reload])
  return { data, error, reload }
}
export function useAction() {
  const lock = useRef(false)
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  const run = async (task: () => Promise<void>) => {
    if (lock.current) return
    lock.current = true
    setBusy(true)
    setError('')
    try {
      await task()
    } catch (failure) {
      setError((failure as Error).message)
    } finally {
      lock.current = false
      setBusy(false)
    }
  }
  return { busy, error, run }
}
