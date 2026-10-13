import { apiClient } from '../client'
import type { PageResult } from '../types'

export interface OrderItemInput {
  productId: number
  qty: number
}

export interface OrderView {
  id: number
  orderNumber: string
  receiptNumber: string | null
  status: 'open' | 'paid' | 'cancelled'
  subtotal: number
  discount: number
  discountName: string | null
  tax: number
  total: number
  paymentMethod: 'cash' | 'card' | 'qr' | null
  customerId: number | null
  customerName: string | null
  pointsRedeemed: number
  pointsEarned: number
  voidReason: string | null
  voidedAt: string | null
  createdAt: string
  items: { productId: number; name: string; qty: number; price: number }[]
}

export const orderService = {
  create(payload: { items: OrderItemInput[]; discountId?: number; customerId?: number; redeemPoints?: number }) {
    return apiClient.post<{ data: OrderView }>('/orders', payload)
  },
  pay(orderId: number, method: 'cash' | 'card' | 'qr', received?: number) {
    return apiClient.post<{ data: { order: OrderView; received: number; change: number } }>(
      `/orders/${orderId}/pay`,
      { method, received },
    )
  },
  listClosed(params: { page: number; pageSize: number; search?: string }) {
    return apiClient.get<{ data: PageResult<OrderView> }>('/orders', {
      params: { status: 'paid,cancelled', page: params.page, pageSize: params.pageSize, ...(params.search ? { search: params.search } : {}) },
    })
  },
  listOpen() {
    return apiClient.get<{ data: PageResult<OrderView> }>('/orders', { params: { status: 'open', page: 1, pageSize: 100 } })
  },
  discard(orderId: number) {
    return apiClient.post(`/orders/${orderId}/discard`)
  },
  void(orderId: number, reason: string) {
    return apiClient.post<{ data: OrderView }>(`/orders/${orderId}/void`, { reason })
  },
}
