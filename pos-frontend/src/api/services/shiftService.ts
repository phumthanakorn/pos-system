import { apiClient } from '../client'

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

export const shiftService = {
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
