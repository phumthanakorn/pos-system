<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Banknote, CreditCard, QrCode, Check } from '@lucide/vue'
import { useCartStore } from '../../store/modules/cartStore'
import { useShiftStore } from '../../store/modules/shiftStore'
import { orderService, type OrderView } from '../../api/services/orderService'
import { errorMessage } from '../../store/modules/productStore'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; paid: [payload: { order: OrderView; received: number; change: number }] }>()

const cartStore = useCartStore()
const shiftStore = useShiftStore()
const router = useRouter()

const methods = [
  { id: 'cash', label: 'เงินสด', icon: Banknote },
  { id: 'card', label: 'บัตร', icon: CreditCard },
  { id: 'qr', label: 'QR / พร้อมเพย์', icon: QrCode },
] as const

type Method = (typeof methods)[number]['id']
const selected = ref<Method>('cash')
const received = ref<number | null>(null)
const submitting = ref(false)

const total = computed(() => cartStore.total)
const change = computed(() => {
  if (selected.value !== 'cash' || received.value === null) return 0
  return Math.max(0, received.value - total.value)
})
const cashShort = computed(() => selected.value === 'cash' && received.value !== null && received.value < total.value)

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      selected.value = 'cash'
      received.value = null
    }
  },
)

async function confirmPayment() {
  if (!shiftStore.isOpen) {
    toast.error('ยังไม่ได้เปิดกะ กรุณาเปิดกะก่อนขาย')
    return
  }
  if (cashShort.value) {
    toast.error('รับเงินไม่พอ')
    return
  }

  submitting.value = true
  let createdOrderId: number | null = null
  try {
    const { data: created } = await orderService.create(cartStore.orderPayload())
    createdOrderId = created.data.id
    const serverTotal = created.data.total
    if (Math.abs(serverTotal - total.value) > 0.005) {
      // the screen and the server disagree (e.g. tax settings changed): never charge a different amount silently
      await orderService.discard(created.data.id).catch(() => undefined)
      toast.error(`ยอดที่ระบบคิดคือ ฿${serverTotal.toFixed(2)} ไม่ตรงกับที่แสดง กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง`)
      return
    }
    const { data: paid } = await orderService.pay(
      created.data.id,
      selected.value,
      selected.value === 'cash' ? (received.value ?? total.value) : undefined,
    )
    const { order, change: changeAmount } = paid.data
    createdOrderId = null
    cartStore.clear()
    emit('close')
    emit('paid', { order, received: paid.data.received, change: changeAmount })
  } catch (error: unknown) {
    if (createdOrderId !== null) await orderService.discard(createdOrderId).catch(() => undefined)
    toast.error(errorMessage(error, 'ชำระเงินไม่สำเร็จ'))
  } finally {
    submitting.value = false
  }
}

function goOpenShift() {
  emit('close')
  router.push('/shifts')
}
</script>

<template>
  <div v-if="props.open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
    <div class="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl">
      <h2 class="mb-1 text-lg font-bold text-text">เลือกวิธีชำระเงิน</h2>
      <p class="mb-4 text-sm text-text-muted">ยอดที่ต้องชำระ</p>
      <p class="mb-5 text-4xl font-extrabold text-text">฿{{ total.toFixed(2) }}</p>

      <div v-if="!shiftStore.isOpen" class="mb-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">
        ยังไม่ได้เปิดกะ
        <button class="ml-1 font-semibold underline" @click="goOpenShift">ไปเปิดกะ</button>
      </div>

      <div class="mb-5 grid grid-cols-3 gap-2">
        <button
          v-for="method in methods"
          :key="method.id"
          class="flex flex-col items-center gap-1.5 rounded-2xl border-2 p-3 transition"
          :class="
            selected === method.id
              ? 'border-primary bg-primary-soft text-primary'
              : 'border-border bg-bg text-text-muted hover:border-primary/40'
          "
          @click="selected = method.id"
        >
          <component :is="method.icon" class="h-6 w-6" :stroke-width="1.75" />
          <span class="text-xs font-semibold" :class="selected === method.id ? 'text-primary' : 'text-text'">{{
            method.label
          }}</span>
        </button>
      </div>

      <div v-if="selected === 'cash'" class="mb-5 space-y-2">
        <label class="block text-sm font-semibold text-text">รับเงินมา</label>
        <input
          v-model.number="received"
          type="number"
          min="0"
          :placeholder="total.toFixed(2)"
          class="w-full rounded-xl border border-border px-3 py-2.5 text-lg outline-none focus:border-primary"
        />
        <div class="flex justify-between text-sm">
          <span class="text-text-muted">เงินทอน</span>
          <span class="font-bold text-text">฿{{ change.toFixed(2) }}</span>
        </div>
      </div>

      <button
        class="flex w-full items-center justify-center gap-2 rounded-2xl bg-success py-3.5 text-lg font-bold text-white transition hover:bg-success-hover active:scale-95 disabled:opacity-50"
        :disabled="submitting || !shiftStore.isOpen || !cartStore.items.length"
        @click="confirmPayment"
      >
        <Check class="h-5 w-5" :stroke-width="2.5" />
        {{ submitting ? 'กำลังบันทึก...' : 'ยืนยันชำระเงิน' }}
      </button>
      <button
        class="mt-2 w-full rounded-2xl py-2.5 text-text-muted transition hover:bg-bg"
        @click="emit('close')"
      >
        ยกเลิก
      </button>
    </div>
  </div>
</template>
