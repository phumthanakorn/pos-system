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

export const reportService = {
  sales(from: string, to: string) {
    return apiClient.get<{ data: SalesReport }>('/reports/sales', { params: { from, to } })
  },
}
