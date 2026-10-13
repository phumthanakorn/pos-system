import { apiClient } from '../client'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  name: string
  email: string
  username: string
  password: string
}

export interface SetupShopPayload {
  shopName: string
  type: 'restaurant' | 'retail' | 'cafe' | 'salon' | 'nail'
  hasDineIn: boolean
  phone?: string
  address?: string
  logoAbbr?: string
}

export const authService = {
  register(payload: RegisterPayload) {
    return apiClient.post('/auth/register', payload)
  },
  login(payload: LoginPayload) {
    return apiClient.post('/auth/login', payload)
  },
  me() {
    return apiClient.get('/auth/me')
  },
  setupShop(payload: SetupShopPayload) {
    return apiClient.post('/auth/setup-shop', payload)
  },
}
