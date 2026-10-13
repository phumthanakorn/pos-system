import { apiClient } from '../client'

export interface SalesReport {
  from: string
  to: string
  totals: {
    netSales: number
    billCount: number
    averageBill: number
    grossBeforeDiscount: number
    discount: number
    tax: number
    cancelledCount: number
    cancelledAmount: number
  }
  byMethod: { cash: number; card: number; qr: number }
  daily: { day: string; total: number; count: number }[]
  topProducts: { productId: number; name: string; qty: number; revenue: number }[]
}

export interface StockReport {
  from: string
  to: string
  trackedCount: number
  stockValue: number
  costlessCount: number
  lowStock: { id: number; name: string; unit: string; stockQty: number; minStock: number }[]
  outOfStock: { id: number; name: string; unit: string }[]
  movement: { purchase: number; sale: number; adjustment: number }
  topMovers: { productId: number; name: string; unit: string; moved: number }[]
}

export interface MemberReport {
  from: string
  to: string
  memberSales: { total: number; billCount: number }
  nonMemberSales: { total: number; billCount: number }
  memberSharePercent: number
  pointsIssued: number
  pointsRedeemed: number
  pointsReversed: number
  pointsAdjusted: number
  newMembers: number
  totalMembers: number
  topCustomers: { customerId: number; name: string; billCount: number; total: number }[]
}

export const reportService = {
  sales(from: string, to: string) {
    return apiClient.get<{ data: SalesReport }>('/reports/sales', { params: { from, to } })
  },
  stock(from: string, to: string) {
    return apiClient.get<{ data: StockReport }>('/reports/stock', { params: { from, to } })
  },
  members(from: string, to: string) {
    return apiClient.get<{ data: MemberReport }>('/reports/members', { params: { from, to } })
  },
}
