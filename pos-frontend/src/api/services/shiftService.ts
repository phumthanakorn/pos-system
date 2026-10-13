import { apiClient } from '../client'
import type { PageResult } from '../types'

export interface CashMovementView {
  id: number
  type: 'in' | 'out'
  amount: number
  reason: string
  createdAt: string
}

export interface SalesSummary {
  cash: number
  card: number
  qr: number
  total: number
  count: number
}

export interface ShiftView {
  id: number
  openingCash: number
  openedAt: string
  cashierName: string
  sales: SalesSummary
  cashIn: number
  cashOut: number
  expectedCash: number
  movements: CashMovementView[]
}

export interface CloseShiftResult {
  id: number
  openingCash: number
  sales: SalesSummary
  cashSales: number
  cashIn: number
  cashOut: number
  expectedCash: number
  closingCash: number
  difference: number
}

export interface ShiftHistoryItem {
  id: number
  cashierName: string
  openedAt: string
  closedAt: string | null
  openingCash: number
  sales: SalesSummary
  cashIn: number
  cashOut: number
  expectedCash: number
  closingCash: number
  difference: number
  cancelledCount: number
  cancelledAmount: number
}

export interface ShiftDetail extends ShiftView {
  status: 'open' | 'closed'
  closedAt: string | null
  closingCash: number | null
  difference: number | null
}

export const shiftService = {
  history(params: { page: number; pageSize: number }) {
    return apiClient.get<{ data: PageResult<ShiftHistoryItem> }>('/shifts/history', { params })
  },
  detail(id: number) {
    return apiClient.get<{ data: ShiftDetail }>(`/shifts/${id}`)
  },
  getCurrent() {
    return apiClient.get<{ data: ShiftView | null }>('/shifts/current')
  },
  open(openingCash: number) {
    return apiClient.post<{ data: ShiftView }>('/shifts/open', { openingCash })
  },
  addCashMovement(type: 'in' | 'out', amount: number, reason: string) {
    return apiClient.post<{ data: ShiftView }>('/shifts/cash-movements', { type, amount, reason })
  },
  close(closingCash: number) {
    return apiClient.post<{ data: CloseShiftResult }>('/shifts/close', { closingCash })
  },
}
