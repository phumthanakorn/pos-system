<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { Search, Printer, Ban } from '@lucide/vue'
import { toast } from 'vue-sonner'
import { orderService, type OrderView } from '../../api/services/orderService'
import { errorMessage } from '../../store/modules/productStore'
import { useAuthStore } from '../../store/modules/authStore'
import PaginationBar from '../../components/PaginationBar.vue'
import ReceiptModal from '../../components/ReceiptModal.vue'

const authStore = useAuthStore()
const orders = ref<OrderView[]>([])
const viewing = ref<OrderView | null>(null)
const loading = ref(true)
const voidingId = ref<number | null>(null)
const search = ref('')
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
let requestId = 0

const methodLabel: Record<string, string> = { cash: 'เงินสด', card: 'บัตร', qr: 'QR / พร้อมเพย์' }
const canVoid = computed(() => authStore.user?.role === 'owner' || authStore.user?.role === 'manager')

async function load() {
  const mine = (requestId += 1)
  loading.value = true
  try {
    const { data } = await orderService.listClosed({ page: page.value, pageSize: pageSize.value, search: search.value.trim() })
    if (mine !== requestId) return // a newer request already replaced this one
    orders.value = data.data.items
    total.value = data.data.total
    if (page.value > data.data.totalPages) {
      page.value = data.data.totalPages
      await load()
    }
  } catch (error: unknown) {
    if (mine === requestId) toast.error(errorMessage(error, 'โหลดใบเสร็จไม่สำเร็จ'))
  } finally {
    if (mine === requestId) loading.value = false
  }
}

const reloadSoon = useDebounceFn(() => {
  page.value = 1
  void load()
}, 300)
watch(search, reloadSoon)
watch(pageSize, () => {
  page.value = 1
  void load()
})
watch(page, () => void load())
onMounted(load)

async function voidOrder(order: OrderView) {
  const reason = window.prompt(`ยกเลิกบิล ${order.orderNumber} (฿${order.total.toFixed(2)})\nกรุณาระบุเหตุผล (อย่างน้อย 3 ตัวอักษร)`)
  if (reason === null) return
  if (reason.trim().length < 3) {
    toast.error('กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร')
    return
  }
  voidingId.value = order.id
  try {
    await orderService.void(order.id, reason.trim())
    toast.success('ยกเลิกบิลแล้ว คืนสต็อกเรียบร้อย')
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ยกเลิกบิลไม่สำเร็จ'))
  } finally {
    voidingId.value = null
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between gap-4 border-b border-border bg-surface px-6 py-3">
      <h1 class="text-base font-bold text-text">ประวัติใบเสร็จ</h1>
      <div class="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-primary">
        <Search class="h-4 w-4 text-text-muted" :stroke-width="1.75" />
        <input v-model="search" type="text" placeholder="ค้นหาเลขออเดอร์หรือเลขใบเสร็จ" class="w-64 py-2 text-sm outline-none" />
      </div>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <div v-if="loading && !orders.length" class="text-sm text-text-muted">กำลังโหลด...</div>
      <div v-else-if="!orders.length" class="py-16 text-center text-sm text-text-muted">
        {{ search ? 'ไม่พบรายการที่ค้นหา' : 'ยังไม่มีรายการขาย' }}
      </div>

      <div v-else class="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm" :class="loading ? 'opacity-60' : ''">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-border bg-bg/70 text-xs font-medium text-text-muted">
            <tr>
              <th class="px-5 py-3.5 font-medium">ใบเสร็จ</th>
              <th class="px-5 py-3.5 font-medium">วันเวลา</th>
              <th class="px-5 py-3.5 font-medium">รายการ</th>
              <th class="px-5 py-3.5 font-medium">ชำระโดย</th>
              <th class="px-5 py-3.5 text-right font-medium">ยอดรวม</th>
              <th class="px-5 py-3.5 font-medium">สถานะ</th>
              <th class="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="order in orders" :key="order.id" class="align-middle transition hover:bg-bg/60">
              <td class="whitespace-nowrap px-5 py-4">
                <p class="font-mono text-[13px] font-semibold text-text">{{ order.receiptNumber ?? '—' }}</p>
                <p class="mt-0.5 font-mono text-xs text-text-muted">{{ order.orderNumber }}</p>
              </td>
              <td class="whitespace-nowrap px-5 py-4">
                <p class="text-text">{{ new Date(order.createdAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p>
                <p class="mt-0.5 text-xs text-text-muted">{{ new Date(order.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }} น.</p>
              </td>
              <td class="max-w-xs px-5 py-4">
                <p class="truncate text-text" :title="order.items.map((i) => `${i.name} ×${i.qty}`).join(', ')">
                  {{ order.items.slice(0, 2).map((i) => `${i.name} ×${i.qty}`).join(', ') }}
                </p>
                <p class="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
                  <span v-if="order.items.length > 2">และอีก {{ order.items.length - 2 }} รายการ</span>
                  <span v-if="order.customerName" class="rounded-full bg-primary-soft px-2 py-0.5 text-primary">{{ order.customerName }}</span>
                </p>
              </td>
              <td class="whitespace-nowrap px-5 py-4">
                <span v-if="order.paymentMethod" class="rounded-full bg-bg px-3 py-1 text-xs font-medium text-ink-soft">{{ methodLabel[order.paymentMethod] }}</span>
                <span v-else class="text-text-muted">—</span>
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-right">
                <p class="text-base font-bold" :class="order.status === 'cancelled' ? 'text-text-muted line-through' : 'text-text'">฿{{ order.total.toLocaleString('th-TH', { minimumFractionDigits: 2 }) }}</p>
                <p v-if="order.tax > 0" class="mt-0.5 text-xs text-text-muted">VAT ฿{{ order.tax.toFixed(2) }}</p>
              </td>
              <td class="px-5 py-4">
                <template v-if="order.status === 'cancelled'">
                  <span class="whitespace-nowrap rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">ยกเลิกแล้ว</span>
                  <p v-if="order.voidReason" class="mt-1 max-w-[180px] truncate text-xs text-text-muted" :title="order.voidReason">{{ order.voidReason }}</p>
                </template>
                <span v-else class="whitespace-nowrap rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">ชำระแล้ว</span>
              </td>
              <td class="whitespace-nowrap px-5 py-4 text-right">
                <div v-if="order.status === 'paid'" class="flex items-center justify-end gap-1">
                  <button class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft" @click="viewing = order">
                    <Printer class="h-4 w-4" :stroke-width="1.75" /> ดู/พิมพ์
                  </button>
                  <button
                    v-if="canVoid"
                    class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/10 disabled:opacity-50"
                    :disabled="voidingId === order.id"
                    @click="voidOrder(order)"
                  >
                    <Ban class="h-4 w-4" :stroke-width="1.75" /> ยกเลิก
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <PaginationBar v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </div>
    <ReceiptModal :order="viewing" @close="viewing = null" />
  </div>
</template>
