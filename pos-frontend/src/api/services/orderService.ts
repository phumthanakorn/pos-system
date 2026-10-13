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
  kitchenStatus: 'pending' | 'preparing' | 'ready' | 'served'
  customerId: number | null
  customerName: string | null
  pointsRedeemed: number
  pointsEarned: number
  voidReason: string | null
  voidedAt: string | null
  createdAt: string
  items: { productId: number; name: string; qty: number; price: number }[]
}

export interface CreateOrderPayload {
  items: OrderItemInput[]
  discountId?: number
  customerId?: number
  redeemPoints?: number
  allowOversell?: boolean
}

export const orderService = {
  create(payload: CreateOrderPayload) {
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
  kitchenQueue() {
    return apiClient.get<{ data: OrderView[] }>('/orders/kitchen')
  },
  updateKitchenStatus(orderId: number, status: 'pending' | 'preparing' | 'ready' | 'served') {
    return apiClient.patch<{ data: OrderView }>(`/orders/${orderId}/kitchen`, { status })
  },
  discard(orderId: number) {
    return apiClient.post(`/orders/${orderId}/discard`)
  },
  void(orderId: number, reason: string) {
    return apiClient.post<{ data: OrderView }>(`/orders/${orderId}/void`, { reason })
  },
}

// Creates an order; if the server reports too little stock and the user is allowed to override
// (owner/manager), asks for confirmation and retries once with the override flag.
export async function createOrderConfirmingStock(payload: CreateOrderPayload) {
  try {
    return await orderService.create(payload)
  } catch (error: unknown) {
    const info = (error as { response?: { data?: { message?: { code?: string; canOverride?: boolean; message?: string } } } })
      ?.response?.data?.message
    if (info?.code === 'INSUFFICIENT_STOCK' && info.canOverride && window.confirm(`${info.message}\n\nขายต่อทั้งที่สต็อกไม่พอไหม?`)) {
      return orderService.create({ ...payload, allowOversell: true })
    }
    throw error
  }
}
