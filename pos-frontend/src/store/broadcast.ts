// Mirrors live cart state from the cashier's POS tab to a "customer display" tab/window open on the
// same browser (e.g. a second monitor facing the customer). No server round trip: BroadcastChannel is
// same-origin, same-browser only — it never reaches another device.
export type DisplayMessage =
  | { type: 'cart'; shopName: string; items: { name: string; qty: number; price: number }[]; subtotal: number; discount: number; tax: number; total: number }
  | { type: 'paid'; order: { orderNumber: string; total: number }; change: number }
  | { type: 'idle' }

const CHANNEL = 'pos-customer-display'

export function getDisplayChannel(): BroadcastChannel | null {
  try {
    return new BroadcastChannel(CHANNEL)
  } catch {
    return null
  }
}
