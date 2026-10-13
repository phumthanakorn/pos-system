<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ChefHat } from '@lucide/vue'
import {
  Store,
  ClipboardList,
  Ticket,
  Clock,
  FileText,
  Package,
  Timer,
  History,
  UtensilsCrossed,
  BarChart3,
  Settings,
  Users,
  Percent,
  Lock,
} from '@lucide/vue'
import { useAuthStore } from '../store/modules/authStore'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

type NavItem = { to: string; label: string; icon: unknown; roles?: string[] }

const allGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'งานขาย',
    items: [
      { to: '/', label: 'สั่งและชำระเงิน', icon: ClipboardList },
      { to: '/open-orders', label: 'ออเดอร์ที่เปิดอยู่', icon: Clock },
      { to: '/kitchen', label: 'จอครัว', icon: ChefHat },
      { to: '/shifts', label: 'รอบการขาย', icon: Timer },
      { to: '/shifts/history', label: 'ประวัติรอบขาย', icon: History, roles: ['owner', 'manager'] },
      { to: '/receipts', label: 'ประวัติใบเสร็จ', icon: FileText },
    ],
  },
  {
    title: 'ข้อมูลหลัก',
    items: [
      { to: '/products', label: 'เมนูและสินค้า', icon: UtensilsCrossed, roles: ['owner', 'manager'] },
      { to: '/discounts', label: 'ส่วนลดและโปรโมชั่น', icon: Percent, roles: ['owner', 'manager'] },
      { to: '/inventory', label: 'คลังวัตถุดิบ', icon: Package, roles: ['owner', 'manager'] },
      { to: '/loyalty', label: 'ลูกค้าและสมาชิก', icon: Ticket },
      { to: '/staff', label: 'พนักงาน', icon: Users, roles: ['owner', 'manager'] },
    ],
  },
  {
    title: 'วิเคราะห์',
    items: [{ to: '/reports', label: 'รายงาน', icon: BarChart3, roles: ['owner', 'manager'] }],
  },
  {
    title: 'ตั้งค่า',
    items: [{ to: '/settings', label: 'ตั้งค่า', icon: Settings, roles: ['owner', 'manager'] }],
  },
]

const navGroups = computed(() =>
  allGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(authStore.user?.role ?? '')),
    }))
    .filter((group) => group.items.length),
)

function backToPin() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <aside class="flex h-full w-60 shrink-0 flex-col bg-ink text-white">
    <div class="flex items-center gap-2.5 px-5 py-5">
      <Store class="h-6 w-6 shrink-0" :stroke-width="2" />
      <span class="truncate text-base font-extrabold tracking-tight">{{ authStore.shop?.name ?? 'ร้านค้าของฉัน' }}</span>
    </div>

    <nav class="flex-1 space-y-5 overflow-y-auto px-3">
      <div v-for="group in navGroups" :key="group.title">
        <p class="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{{ group.title }}</p>
        <div class="space-y-1">
          <RouterLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            class="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
            :class="
              route.path === item.to
                ? 'bg-primary text-white'
                : 'text-white/65 hover:bg-white/10 hover:text-white'
            "
          >
            <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" :stroke-width="2" />
            <span class="truncate">{{ item.label }}</span>
          </RouterLink>
        </div>
      </div>
    </nav>

    <div class="border-t border-white/10 px-3 py-3">
      <button
        class="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white"
        @click="backToPin"
      >
        <Lock class="h-[18px] w-[18px] shrink-0" :stroke-width="2" />
        <span>กลับหน้า PIN</span>
      </button>
    </div>
  </aside>
</template>
