/** Only root-relative, same-site destinations are accepted from query parameters. */
export function safeNext(value: string | null, fallback = '/account'): string {
  if (!value || !value.startsWith('/') || /^\/\//.test(value) || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback
  try {
    const url = new URL(value, 'https://bbp.invalid')
    if (url.origin !== 'https://bbp.invalid' || ['/login', '/register', '/forgot'].includes(url.pathname)) return fallback
    return url.pathname + url.search + url.hash
  } catch {
    return fallback
  }
}
