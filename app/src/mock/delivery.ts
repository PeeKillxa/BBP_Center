/**
 * Fake delivery details, derived on demand from the order id and never persisted.
 * In production these must come from a server endpoint that checks the order owner.
 */
export const mockDeliveryFor = (orderId: string) => {
  const tag = orderId.replace(/[^A-Z0-9]/gi, '').slice(-6).toLowerCase()
  return {
    username: `demo_bbp_${tag}`,
    password: `DEMO-ONLY-${tag.toUpperCase()}`,
    email: `demo+${tag}@example.invalid`,
    note: 'ข้อมูลจำลองสำหรับต้นแบบเท่านั้น ใช้เข้าสู่ระบบจริงไม่ได้',
  }
}
