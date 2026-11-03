/** Keep the redeem dependency entirely outside the Vite/browser dependency graph. */
export async function redeemVoucher(phone, code) {
  const { default: redeem } = await import('@fortune-inc/tw-voucher')
  return redeem(phone, code)
}
