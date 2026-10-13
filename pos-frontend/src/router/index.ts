import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '../layouts/AdminLayout.vue'
import PosView from '../modules/pos/PosView.vue'
import { useAuthStore } from '../store/modules/authStore'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../modules/onboarding/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../modules/onboarding/RegisterView.vue'),
    },
    {
      path: '/setup',
      name: 'setup',
      component: () => import('../modules/onboarding/SetupView.vue'),
    },
    {
      // standalone, no admin chrome — meant for a second monitor facing the customer
      path: '/customer-display',
      name: 'customer-display',
      component: () => import('../modules/pos/CustomerDisplayView.vue'),
    },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', name: 'pos', component: PosView },
        {
          path: 'kitchen',
          name: 'kitchen',
          component: () => import('../modules/kitchen/KitchenView.vue'),
        },
        {
          path: 'loyalty',
          name: 'loyalty',
          component: () => import('../modules/loyalty/LoyaltyView.vue'),
        },
        {
          path: 'open-orders',
          name: 'open-orders',
          component: () => import('../modules/orders/OpenOrdersView.vue'),
        },
        {
          path: 'receipts',
          name: 'receipts',
          component: () => import('../modules/receipts/ReceiptsView.vue'),
        },
        {
          path: 'inventory',
          name: 'inventory',
          component: () => import('../modules/inventory/InventoryView.vue'),
          meta: { roles: ['owner', 'manager'] },
        },
        {
          path: 'shifts/history',
          name: 'shift-history',
          component: () => import('../modules/shifts/ShiftHistoryView.vue'),
          meta: { roles: ['owner', 'manager'] },
        },
        {
          path: 'shifts',
          name: 'shifts',
          component: () => import('../modules/shifts/ShiftsView.vue'),
        },
        {
          path: 'products',
          name: 'products',
          component: () => import('../modules/products/ProductsView.vue'),
          meta: { roles: ['owner', 'manager'] },
        },
        {
          path: 'settings',
          name: 'settings',
          component: () => import('../modules/settings/SettingsView.vue'),
          meta: { roles: ['owner', 'manager'] },
        },
        {
          path: 'discounts',
          name: 'discounts',
          component: () => import('../modules/discounts/DiscountsView.vue'),
          meta: { roles: ['owner', 'manager'] },
        },
        {
          path: 'staff',
          name: 'staff',
          component: () => import('../modules/staff/StaffView.vue'),
          meta: { roles: ['owner', 'manager'] },
        },
        {
          path: 'reports',
          name: 'reports',
          component: () => import('../modules/reports/ReportsView.vue'),
          meta: { roles: ['owner', 'manager'] },
        },
      ],
    },
  ],
})

const GUEST_ONLY_ROUTES = ['login', 'register']

router.beforeEach(async (to) => {
  const authStore = useAuthStore()
  const routeName = String(to.name)

  if (authStore.isAuthenticated && !authStore.user) {
    try {
      await authStore.restoreProfile()
    } catch {
      // an invalid/expired token is cleared by the 401 handler; anything else falls through to login
      authStore.logout()
    }
  }

  // ยังไม่ login: อนุญาตเฉพาะ login/register, อย่างอื่นเด้งไป login
  if (!authStore.isAuthenticated) {
    return GUEST_ONLY_ROUTES.includes(routeName) ? true : { name: 'login' }
  }

  // login แล้วแต่ยังไม่ได้ตั้งค่าร้าน: บังคับอยู่หน้า setup เท่านั้น
  if (authStore.needsSetup) {
    return routeName === 'setup' ? true : { name: 'setup' }
  }

  // login แล้วและมีร้านแล้ว: ห้ามย้อนกลับไปหน้า login/register/setup
  if (GUEST_ONLY_ROUTES.includes(routeName) || routeName === 'setup') {
    return { name: 'pos' }
  }

  // หน้าที่จำกัดสิทธิ์ (ฝั่ง server ก็บังคับซ้ำ นี่แค่กันไม่ให้เข้าหน้าที่ใช้ไม่ได้)
  const allowed = to.meta.roles as string[] | undefined
  if (allowed && !allowed.includes(authStore.user?.role ?? '')) {
    return { name: 'pos' }
  }

  return true
})

export default router
