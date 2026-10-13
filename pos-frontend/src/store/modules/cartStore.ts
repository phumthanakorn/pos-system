import { defineStore } from 'pinia'
import type { LoyaltySettings, TaxSettings } from '../../api/services/settingsService'
import type { DiscountView } from '../../api/services/discountService'

export interface CartItem {
  productId: number
  name: string
  price: number
  qty: number
  discount: number
}

const round2 = (value: number) => Math.round(value * 100) / 100

// Display-only mirror of the server's calculateTotals (pos-backend/src/common/helpers/money.ts).
// The server recomputes everything when the order is created and its numbers are the ones charged.
export function estimateTotals(subtotal: number, discount: number, tax: TaxSettings | null) {
  const taxable = round2(Math.max(0, subtotal - discount))
  if (!tax || !tax.enabled || tax.rate <= 0) return { tax: 0, total: taxable }
  if (tax.isInclusive) return { tax: round2(taxable - taxable / (1 + tax.rate / 100)), total: taxable }
  const vat = round2(taxable * (tax.rate / 100))
  return { tax: vat, total: round2(taxable + vat) }
}

// Display-only mirror of the server's calculateDiscount; capped at the subtotal like the server.
export function estimateDiscount(subtotal: number, rule: Pick<DiscountView, 'type' | 'value'> | null) {
  if (!rule || subtotal <= 0) return 0
  const raw = rule.type === 'percent' ? subtotal * (Math.min(rule.value, 100) / 100) : rule.value
  return round2(Math.min(Math.max(raw, 0), subtotal))
}

export interface CartCustomer {
  id: number
  name: string
  points: number
}

// Display-only mirrors of pos-backend/src/common/helpers/loyalty.ts (pointsValue / maxRedeemablePoints).
export function estimatePointsValue(points: number, loyalty: LoyaltySettings | null) {
  if (!loyalty || points <= 0) return 0
  return Math.round((points / loyalty.pointsPerBaht) * 100) / 100
}
export function estimateMaxPoints(balance: number, discountable: number, loyalty: LoyaltySettings | null) {
  if (!loyalty?.enabled || balance <= 0 || discountable <= 0) return 0
  const byAmount = Math.floor(Math.round(discountable * loyalty.pointsPerBaht * 100) / 100)
  return Math.max(Math.min(balance, byAmount), 0)
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    selectedDiscount: null as DiscountView | null,
    taxSettings: null as TaxSettings | null,
    loyalty: null as LoyaltySettings | null,
    customer: null as CartCustomer | null,
    redeemPoints: 0,
  }),
  getters: {
    subtotal: (state) => round2(state.items.reduce((sum, item) => sum + item.price * item.qty, 0)),
    ruleDiscount(): number {
      return estimateDiscount(this.subtotal, this.selectedDiscount)
    },
    // points that can still be spent on this bill (balance and remaining amount both limit it)
    maxPoints(): number {
      return estimateMaxPoints(this.customer?.points ?? 0, round2(this.subtotal - this.ruleDiscount), this.loyalty)
    },
    pointsUsed(): number {
      return this.customer ? Math.min(this.redeemPoints, this.maxPoints) : 0
    },
    pointsDiscount(): number {
      return estimatePointsValue(this.pointsUsed, this.loyalty)
    },
    discount(): number {
      return round2(this.ruleDiscount + this.pointsDiscount)
    },
    totals(): { tax: number; total: number } {
      return estimateTotals(this.subtotal, this.discount, this.taxSettings)
    },
    tax(): number {
      return this.totals.tax
    },
    total(): number {
      return this.totals.total
    },
  },
  actions: {
    addItem(item: CartItem) {
      const existing = this.items.find((i) => i.productId === item.productId)
      if (existing) {
        existing.qty += item.qty
      } else {
        this.items.push(item)
      }
    },
    removeItem(productId: number) {
      this.items = this.items.filter((i) => i.productId !== productId)
    },
    incrementItem(productId: number) {
      const item = this.items.find((i) => i.productId === productId)
      if (item) item.qty += 1
    },
    decrementItem(productId: number) {
      const item = this.items.find((i) => i.productId === productId)
      if (!item) return
      if (item.qty <= 1) {
        this.removeItem(productId)
      } else {
        item.qty -= 1
      }
    },
    // exactly what the server needs to create the order for this cart
    orderPayload() {
      return {
        items: this.items.map((item) => ({ productId: item.productId, qty: item.qty })),
        discountId: this.selectedDiscount?.id,
        customerId: this.customer?.id,
        redeemPoints: this.pointsUsed > 0 ? this.pointsUsed : undefined,
      }
    },
    clear() {
      this.items = []
      this.selectedDiscount = null
      this.customer = null
      this.redeemPoints = 0
    },
  },
})
