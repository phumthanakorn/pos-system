import { apiClient } from '../client'

export const paymentService = {
  pay(orderId: number, payload: unknown) {
    return apiClient.post(`/orders/${orderId}/payments`, payload)
  },
}
