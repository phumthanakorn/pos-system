<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { ChefHat, Clock } from '@lucide/vue'
import { orderService, type OrderView } from '../../api/services/orderService'
import { errorMessage } from '../../store/modules/productStore'

const orders = ref<OrderView[]>([])
const loading = ref(true)
let pollId: ReturnType<typeof setInterval> | undefined

const columns = [
  { status: 'pending', label: 'รอทำ', action: 'preparing', actionLabel: 'เริ่มทำ' },
  { status: 'preparing', label: 'กำลังทำ', action: 'ready', actionLabel: 'เสร็จแล้ว' },
  { status: 'ready', label: 'พร้อมเสิร์ฟ', action: 'served', actionLabel: 'เสิร์ฟแล้ว' },
] as const

async function load() {
  try {
    const { data } = await orderService.kitchenQueue()
    orders.value = data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดคิวครัวไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}

function ordersIn(status: string) {
  return orders.value.filter((o) => o.kitchenStatus === status).sort((a, b) => a.id - b.id)
}

async function advance(order: OrderView, next: 'pending' | 'preparing' | 'ready' | 'served') {
  const before = order.kitchenStatus
  order.kitchenStatus = next
  try {
    await orderService.updateKitchenStatus(order.id, next)
    if (next === 'served') orders.value = orders.value.filter((o) => o.id !== order.id)
  } catch (error: unknown) {
    order.kitchenStatus = before
    toast.error(errorMessage(error, 'อัปเดตสถานะไม่สำเร็จ'))
  }
}

function minutesAgo(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

onMounted(() => {
  load()
  pollId = setInterval(load, 5000)
})
onUnmounted(() => {
  if (pollId) clearInterval(pollId)
})
</script>

<template>
  <div class="flex h-full flex-col bg-bg">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <h1 class="flex items-center gap-2 text-base font-bold text-text"><ChefHat :size="20" /> จอครัว</h1>
      <span class="text-xs text-text-muted">อัปเดตอัตโนมัติทุก 5 วินาที</span>
    </header>

    <div v-if="loading" class="flex-1 p-6 text-sm text-text-muted">กำลังโหลด...</div>
    <div v-else class="grid flex-1 grid-cols-3 gap-4 overflow-hidden p-5">
      <div v-for="col in columns" :key="col.status" class="flex flex-col overflow-hidden rounded-2xl bg-surface shadow-sm">
        <div class="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 class="font-semibold text-text">{{ col.label }}</h2>
          <span class="rounded-full bg-bg px-2.5 py-0.5 text-xs font-semibold text-ink-soft">{{ ordersIn(col.status).length }}</span>
        </div>
        <div class="flex-1 space-y-3 overflow-y-auto p-3">
          <div v-for="order in ordersIn(col.status)" :key="order.id" class="rounded-xl border border-border bg-bg/60 p-3">
            <div class="mb-2 flex items-center justify-between">
              <span class="font-mono text-sm font-bold text-text">{{ order.orderNumber }}</span>
              <span class="flex items-center gap-1 text-xs text-text-muted"><Clock :size="12" /> {{ minutesAgo(order.createdAt) }} นาที</span>
            </div>
            <ul class="mb-3 space-y-1 text-sm text-ink-soft">
              <li v-for="item in order.items" :key="item.productId">{{ item.qty }}× {{ item.name }}</li>
            </ul>
            <button class="w-full rounded-lg bg-primary py-1.5 text-xs font-semibold text-white hover:bg-primary-hover" @click="advance(order, col.action)">
              {{ col.actionLabel }}
            </button>
          </div>
          <p v-if="!ordersIn(col.status).length" class="py-8 text-center text-xs text-text-muted">ไม่มีออเดอร์</p>
        </div>
      </div>
    </div>
  </div>
</template>
