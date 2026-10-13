import { apiClient } from '../client'

export interface DiscountView {
  id: number
  name: string
  type: 'percent' | 'amount'
  value: number
  isActive: boolean
  managerOnly: boolean
  startsAt: string | null
  endsAt: string | null
}

export interface DiscountInput {
  name: string
  type: 'percent' | 'amount'
  value: number
  isActive: boolean
  managerOnly: boolean
  startsAt: string | null
  endsAt: string | null
}

export const discountService = {
  list() {
    return apiClient.get<{ data: DiscountView[] }>('/discounts')
  },
  usable() {
    return apiClient.get<{ data: DiscountView[] }>('/discounts/usable')
  },
  create(payload: DiscountInput) {
    return apiClient.post<{ data: DiscountView }>('/discounts', payload)
  },
  update(id: number, payload: Partial<DiscountInput>) {
    return apiClient.patch<{ data: DiscountView }>(`/discounts/${id}`, payload)
  },
  remove(id: number) {
    return apiClient.delete(`/discounts/${id}`)
  },
}
