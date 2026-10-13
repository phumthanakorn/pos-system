import { apiClient } from '../client'
import type { PageResult } from '../types'

export interface Customer {
  id: number
  name: string
  phone: string
  note: string
  points: number
  createdAt: string
}

export interface PointEntry {
  id: number
  type: 'earn' | 'redeem' | 'reverse_earn' | 'refund_redeem' | 'adjust'
  points: number
  balanceAfter: number
  note: string | null
  createdAt: string
}

export interface CustomerDetail extends Customer {
  billCount: number
  totalSpent: number
  recentOrders: { id: number; orderNumber: string; total: number; createdAt: string }[]
  pointHistory: PointEntry[]
}

export interface CustomerInput {
  name: string
  phone: string
  note: string
}

export const customerService = {
  list(params: { page: number; pageSize: number; search?: string }) {
    return apiClient.get<{ data: PageResult<Customer> }>('/customers', {
      params: { page: params.page, pageSize: params.pageSize, ...(params.search ? { search: params.search } : {}) },
    })
  },
  detail(id: number) {
    return apiClient.get<{ data: CustomerDetail }>(`/customers/${id}`)
  },
  create(payload: CustomerInput) {
    return apiClient.post<{ data: Customer }>('/customers', payload)
  },
  update(id: number, payload: CustomerInput) {
    return apiClient.patch<{ data: Customer }>(`/customers/${id}`, payload)
  },
  remove(id: number) {
    return apiClient.delete(`/customers/${id}`)
  },
  recalculatePoints(id?: number) {
    return apiClient.post<{ data: { orders: number; points: number } }>(
      id === undefined ? '/customers/recalculate-points' : `/customers/${id}/recalculate-points`,
    )
  },
  adjustPoints(id: number, points: number, reason: string) {
    return apiClient.post<{ data: CustomerDetail }>(`/customers/${id}/points`, { points, reason })
  },
}
