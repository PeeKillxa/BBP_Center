// getRandomValues also works on private LAN HTTP origins. Keep 128 bits of
// cryptographic randomness without depending on the HTTPS-only randomUUID API.
export function idempotencyKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
