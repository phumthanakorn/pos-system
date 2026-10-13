import { apiClient } from '../client'

export type StaffRole = 'owner' | 'manager' | 'cashier'

export interface StaffView {
  id: number
  name: string
  email: string
  username: string
  role: StaffRole
  isActive: boolean
}

export interface CreateStaffInput {
  name: string
  email: string
  username: string
  password: string
  role: 'manager' | 'cashier'
}

export const staffService = {
  list() {
    return apiClient.get<{ data: StaffView[] }>('/users')
  },
  create(payload: CreateStaffInput) {
    return apiClient.post<{ data: StaffView }>('/users', payload)
  },
  update(id: number, payload: Partial<Pick<StaffView, 'name' | 'isActive'> & { role: 'manager' | 'cashier'; password: string }>) {
    return apiClient.patch<{ data: StaffView }>(`/users/${id}`, payload)
  },
}
