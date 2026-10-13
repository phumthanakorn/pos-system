import { apiClient } from '../client'

export const paymentService = {
  promptPay(amount: number) {
    return apiClient.get<{ data: { configured: boolean; payload: string | null } }>('/payments/promptpay', { params: { amount } })
  },
}
