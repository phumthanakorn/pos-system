import { defineStore } from 'pinia'
import {
  authService,
  type LoginPayload,
  type RegisterPayload,
  type SetupShopPayload,
} from '../../api/services/authService'

interface AuthUser {
  id: number
  name: string
  email: string
  username: string
  role: 'cashier' | 'manager' | 'owner'
}

interface AuthShop {
  id: number
  name: string
  slug: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user') ?? 'null') as AuthUser | null,
    shop: JSON.parse(localStorage.getItem('shop') ?? 'null') as AuthShop | null,
    accessToken: localStorage.getItem('accessToken'),
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.accessToken),
    needsSetup: (state) => Boolean(state.accessToken) && !state.shop,
  },
  actions: {
    applySession(data: { accessToken: string; user: AuthUser; shop: AuthShop | null }) {
      this.accessToken = data.accessToken
      this.user = data.user
      this.shop = data.shop
      localStorage.setItem('accessToken', data.accessToken)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.shop) {
        localStorage.setItem('shop', JSON.stringify(data.shop))
      } else {
        localStorage.removeItem('shop')
      }
    },
    async register(payload: RegisterPayload) {
      await authService.register(payload)
    },
    async login(payload: LoginPayload) {
      const { data } = await authService.login(payload)
      this.applySession(data.data)
    },
    // Sessions created before the user was cached (or a cleared cache) have a token but no profile:
    // ask the server who we are instead of guessing, so role-based menus are always correct.
    async restoreProfile() {
      if (!this.accessToken || this.user) return
      const { data } = await authService.me()
      this.user = data.data.user
      this.shop = data.data.shop
      localStorage.setItem('user', JSON.stringify(data.data.user))
      if (data.data.shop) {
        localStorage.setItem('shop', JSON.stringify(data.data.shop))
      } else {
        localStorage.removeItem('shop')
      }
    },
    async setupShop(payload: SetupShopPayload) {
      const { data } = await authService.setupShop(payload)
      this.applySession(data.data)
    },
    logout() {
      this.user = null
      this.shop = null
      this.accessToken = null
      localStorage.removeItem('accessToken')
      localStorage.removeItem('shop')
      localStorage.removeItem('user')
    },
  },
})
