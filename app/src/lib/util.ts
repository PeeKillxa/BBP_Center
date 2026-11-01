export const cn = (...c: Array<string | false | null | undefined>) => c.filter(Boolean).join(' ')

let counter = 0
export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36).toUpperCase()}${(counter++).toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`

/** Non-cryptographic fingerprint for demo duplicate detection. Not a security control. */
export const fingerprint = (s: string): string => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(16)
}
