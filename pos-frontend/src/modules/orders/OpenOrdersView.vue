<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Clock, Banknote, CreditCard, QrCode, Trash2 } from '@lucide/vue'
import { orderService, type OrderView } from '../../api/services/orderService'
import { errorMessage } from '../../store/modules/productStore'
import PromptPayQr from '../../components/PromptPayQr.vue'
import ReceiptModal from '../../components/ReceiptModal.vue'

const orders = ref<OrderView[]>([])
const loading = ref(true)
const paying = ref<OrderView | null>(null)
const method = ref<'cash' | 'card' | 'qr'>('cash')
const received = ref<number | null>(null)
const busy = ref(false)
const receipt = ref<{ order: OrderView; received: number; change: number } | null>(null)

const methods = [
  { id: 'cash', label: 'เงินสด', icon: Banknote },
  { id: 'card', label: 'บัตร', icon: CreditCard },
  { id: 'qr', label: 'QR / พร้อมเพย์', icon: QrCode },
] as const

const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const cashShort = computed(() => method.value === 'cash' && received.value !== null && paying.value !== null && received.value < paying.value.total)

async function load() {
  try {
    orders.value = (await orderService.listOpen()).data.data.items
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดออเดอร์ไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function startPay(order: OrderView) {
  paying.value = order
  method.value = 'cash'
  received.value = null
}

async function confirmPay() {
  if (!paying.value || cashShort.value) {
    if (cashShort.value) toast.error('รับเงินไม่พอ')
    return
  }
  busy.value = true
  try {
    const { data } = await orderService.pay(paying.value.id, method.value, method.value === 'cash' ? (received.value ?? paying.value.total) : undefined)
    paying.value = null
    receipt.value = data.data
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ชำระเงินไม่สำเร็จ'))
    await load()
  } finally {
    busy.value = false
  }
}

async function discard(order: OrderView) {
  if (!confirm(`ยกเลิกออเดอร์ ${order.orderNumber} ใช่ไหม?`)) return
  try {
    await orderService.discard(order.id)
    toast.success('ยกเลิกออเดอร์แล้ว')
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ยกเลิกไม่สำเร็จ'))
  }
}
</script>

<template>
  <div class="h-full overflow-y-auto"><div class="mx-auto max-w-6xl space-y-4 p-6">
    <div>
      <h1 class="text-xl font-semibold text-text">ออเดอร์ที่เปิดอยู่</h1>
      <p class="text-sm text-text-muted">บิลที่ส่งคำสั่งไว้และยังไม่ชำระเงิน</p>
    </div>

    <p v-if="loading" class="text-text-muted">กำลังโหลด...</p>
    <div v-else-if="!orders.length" class="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface py-16 text-text-muted">
      <Clock :size="36" :stroke-width="1.5" />
      <p>ไม่มีออเดอร์ค้างอยู่</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="o in orders" :key="o.id" class="flex flex-col rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-start justify-between">
          <div>
            <p class="font-semibold text-text">{{ o.orderNumber }}</p>
            <p class="text-xs text-text-muted">{{ new Date(o.createdAt).toLocaleString('th-TH') }}</p>
          </div>
          <p class="text-lg font-bold text-text">฿{{ baht(o.total) }}</p>
        </div>
        <ul class="my-3 flex-1 space-y-1 border-y border-dashed border-border py-3 text-sm text-ink-soft">
          <li v-for="item in o.items" :key="item.productId" class="flex justify-between gap-2">
            <span>{{ item.name }} x{{ item.qty }}</span><span>{{ baht(item.qty * item.price) }}</span>
          </li>
        </ul>
        <div class="flex gap-2">
          <button class="flex items-center justify-center gap-1 rounded-xl border border-border px-3 py-2 text-sm text-danger hover:border-danger" @click="discard(o)">
            <Trash2 :size="16" /> ยกเลิก
          </button>
          <button class="flex-1 rounded-xl bg-success px-3 py-2 text-sm font-semibold text-white hover:opacity-90" @click="startPay(o)">ชำระเงิน</button>
        </div>
      </div>
    </div>

    <div v-if="paying" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div class="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl">
        <h2 class="text-lg font-bold text-text">ชำระเงิน {{ paying.orderNumber }}</h2>
        <p class="my-3 text-4xl font-extrabold text-text">฿{{ baht(paying.total) }}</p>
        <div class="mb-4 grid grid-cols-3 gap-2">
          <button
            v-for="m in methods"
            :key="m.id"
            class="flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 text-xs font-semibold"
            :class="method === m.id ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-bg text-text-muted'"
            @click="method = m.id"
          >
            <component :is="m.icon" class="h-6 w-6" :stroke-width="1.75" />{{ m.label }}
          </button>
        </div>
        <div v-if="method === 'qr'" class="mb-4">
          <PromptPayQr :amount="paying.total" />
        </div>
        <div v-if="method === 'cash'" class="mb-4">
          <input v-model.number="received" type="number" min="0" :placeholder="`รับเงิน (เว้นว่าง = พอดี ${baht(paying.total)})`" class="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <p v-if="received !== null && !cashShort" class="mt-1 text-sm text-text-muted">เงินทอน ฿{{ baht(received - paying.total) }}</p>
          <p v-if="cashShort" class="mt-1 text-sm text-danger">รับเงินไม่พอ</p>
        </div>
        <div class="flex gap-2">
          <button class="flex-1 rounded-xl border border-border py-2.5 text-sm text-ink-soft" @click="paying = null">ยกเลิก</button>
          <button class="flex-1 rounded-xl bg-success py-2.5 text-sm font-semibold text-white disabled:opacity-40" :disabled="busy || cashShort" @click="confirmPay">ยืนยัน</button>
        </div>
      </div>
    </div>

    <ReceiptModal :order="receipt?.order ?? null" :received="receipt?.received" :change="receipt?.change" @close="receipt = null" />
  </div>
  </div>
</template>
