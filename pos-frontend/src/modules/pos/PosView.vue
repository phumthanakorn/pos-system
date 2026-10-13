<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useNow } from '@vueuse/core'
import { Circle } from '@lucide/vue'
import ProductGrid from './ProductGrid.vue'
import Cart from './Cart.vue'
import PaymentModal from './PaymentModal.vue'
import CustomerPicker from './CustomerPicker.vue'
import type { Customer } from '../../api/services/customerService'
import ReceiptModal from '../../components/ReceiptModal.vue'
import { createOrderConfirmingStock, type OrderView } from '../../api/services/orderService'
import { toast } from 'vue-sonner'
import { errorMessage, useProductStore } from '../../store/modules/productStore'
import { useAuthStore } from '../../store/modules/authStore'
import { useCartStore } from '../../store/modules/cartStore'
import { useShiftStore } from '../../store/modules/shiftStore'
import { settingsService } from '../../api/services/settingsService'
import { discountService, type DiscountView } from '../../api/services/discountService'
import { Percent, X, UserRound, Monitor } from '@lucide/vue'
import { getDisplayChannel } from '../../store/broadcast'
import { watch } from 'vue'

const router = useRouter()
const showDiscounts = ref(false)
const usableDiscounts = ref<DiscountView[]>([])

async function openDiscounts() {
  try {
    usableDiscounts.value = (await discountService.usable()).data.data
  } catch {
    usableDiscounts.value = []
  }
  showDiscounts.value = true
}

function pickDiscount(d: DiscountView | null) {
  cartStore.selectedDiscount = d
  showDiscounts.value = false
}
const showPayment = ref(false)
const showCustomers = ref(false)

function pickCustomer(c: Customer) {
  cartStore.customer = { id: c.id, name: c.name, points: c.points }
  cartStore.redeemPoints = 0
  showCustomers.value = false
}
function clearCustomer() {
  cartStore.customer = null
  cartStore.redeemPoints = 0
}
const holding = ref(false)

// Saves the cart as an open (unpaid) order so it can be paid later from "ออเดอร์ที่เปิดอยู่"
async function holdOrder() {
  if (!shiftStore.isOpen) {
    toast.error('ยังไม่ได้เปิดกะ กรุณาเปิดกะก่อนขาย')
    return
  }
  holding.value = true
  try {
    const { data } = await createOrderConfirmingStock(cartStore.orderPayload())
    cartStore.clear()
    void productStore.load().catch(() => undefined)
    toast.success(`ส่งคำสั่งแล้ว ${data.data.orderNumber}`, { description: 'ชำระเงินได้ที่เมนู ออเดอร์ที่เปิดอยู่' })
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ส่งคำสั่งไม่สำเร็จ'))
  } finally {
    holding.value = false
  }
}
const receipt = ref<{ order: OrderView; received: number; change: number } | null>(null)
const now = useNow()
const cartStore = useCartStore()
const productStore = useProductStore()
const authStore = useAuthStore()
const shiftStore = useShiftStore()

const channel = getDisplayChannel()
function broadcastCart() {
  channel?.postMessage({
    type: 'cart',
    shopName: authStore.shop?.name ?? '',
    items: cartStore.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    subtotal: cartStore.subtotal,
    discount: cartStore.discount,
    tax: cartStore.tax,
    total: cartStore.total,
  })
}
watch(() => [cartStore.items, cartStore.selectedDiscount, cartStore.redeemPoints, cartStore.taxSettings], broadcastCart, { deep: true })

function openCustomerDisplay() {
  window.open('/customer-display', 'pos-customer-display', 'width=480,height=800')
}

onMounted(() => {
  shiftStore.load().catch(() => {})
  settingsService
    .get()
    .then(({ data }) => {
      cartStore.taxSettings = data.data.tax
      cartStore.loyalty = data.data.loyalty
    })
    .catch(() => {})
})
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <h1 class="text-base font-bold text-text">สั่งและชำระเงิน</h1>
      <div class="flex items-center gap-3 text-sm text-text-muted">
        <button
          v-if="shiftStore.isOpen"
          class="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success"
          @click="router.push('/shifts')"
        >
          <Circle class="h-2 w-2 fill-current" />
          กะเปิดอยู่
        </button>
        <button
          v-else
          class="flex items-center gap-1.5 rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger"
          @click="router.push('/shifts')"
        >
          <Circle class="h-2 w-2 fill-current" />
          ยังไม่เปิดกะ · เปิดกะ
        </button>
        <button class="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-ink-soft hover:bg-border" title="เปิดจอแสดงให้ลูกค้าดูในหน้าต่างใหม่" @click="openCustomerDisplay">
          <Monitor class="h-3.5 w-3.5" /> จอลูกค้า
        </button>
        <time>{{ now.toLocaleTimeString('th-TH') }}</time>
      </div>
    </header>

    <div class="grid flex-1 grid-cols-[2fr_380px] gap-4 overflow-hidden bg-bg p-4">
      <ProductGrid class="overflow-hidden rounded-3xl bg-bg" />

      <div class="flex flex-col gap-3 overflow-hidden">
        <Cart class="flex-1 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.05)]" />

        <div class="rounded-2xl border bg-surface px-3 py-2.5 text-sm" :class="cartStore.customer ? 'border-primary' : 'border-border'">
          <button v-if="!cartStore.customer" class="flex w-full items-center justify-center gap-2 font-semibold text-text" @click="showCustomers = true">
            <UserRound class="h-4 w-4" :stroke-width="2" /> เลือกสมาชิก
          </button>
          <div v-else>
            <div class="flex items-center justify-between">
              <span class="font-semibold text-text">{{ cartStore.customer.name }}</span>
              <span class="flex items-center gap-2">
                <span class="font-semibold text-primary">{{ cartStore.customer.points.toLocaleString('th-TH') }} แต้ม</span>
                <button class="text-text-muted hover:text-danger" title="เอาสมาชิกออก" @click="clearCustomer"><X class="h-4 w-4" /></button>
              </span>
            </div>
            <div v-if="cartStore.loyalty?.enabled && cartStore.maxPoints > 0" class="mt-2 flex items-center gap-2">
              <input
                v-model.number="cartStore.redeemPoints"
                type="number"
                min="0"
                :max="cartStore.maxPoints"
                placeholder="ใช้แต้มเป็นส่วนลด"
                class="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary"
              />
              <button class="whitespace-nowrap rounded-lg bg-primary-soft px-2.5 py-1.5 text-xs font-semibold text-primary" @click="cartStore.redeemPoints = cartStore.maxPoints">
                ใช้สูงสุด {{ cartStore.maxPoints }}
              </button>
            </div>
          </div>
        </div>

        <div class="flex gap-3">
          <button
            class="flex-1 rounded-2xl border border-border bg-surface py-3 text-sm font-semibold text-text transition hover:bg-bg disabled:opacity-40"
            :disabled="cartStore.items.length === 0 || holding"
            @click="holdOrder"
          >
            ส่งคำสั่ง
          </button>
          <button
            class="flex flex-1 items-center justify-center gap-1.5 rounded-2xl border bg-surface py-3 text-sm font-semibold transition hover:bg-bg disabled:opacity-40"
            :class="cartStore.selectedDiscount ? 'border-primary text-primary' : 'border-border text-text'"
            :disabled="!cartStore.items.length"
            @click="openDiscounts"
          >
            <Percent class="h-4 w-4" :stroke-width="2" />
            {{ cartStore.selectedDiscount ? cartStore.selectedDiscount.name : 'ส่วนลด' }}
          </button>
        </div>

        <button
          class="rounded-2xl bg-success py-4 text-lg font-bold text-white shadow-md transition hover:bg-success-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="!cartStore.items.length"
          @click="showPayment = true"
        >
          ยืนยัน · ฿{{ cartStore.total.toFixed(2) }}
        </button>
      </div>
    </div>

    <div v-if="showDiscounts" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4" @click.self="showDiscounts = false">
      <div class="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h2 class="text-lg font-bold text-text">เลือกส่วนลด</h2>
          <button class="text-text-muted hover:text-text" @click="showDiscounts = false"><X class="h-5 w-5" /></button>
        </div>
        <p v-if="!usableDiscounts.length" class="py-6 text-center text-sm text-text-muted">
          ยังไม่มีส่วนลดที่ใช้ได้ในตอนนี้ (เจ้าของร้านเพิ่มได้ที่เมนู "ส่วนลดและโปรโมชั่น")
        </p>
        <div v-else class="space-y-2">
          <button
            v-for="d in usableDiscounts"
            :key="d.id"
            class="flex w-full items-center justify-between rounded-2xl border-2 px-4 py-3 text-left transition"
            :class="cartStore.selectedDiscount?.id === d.id ? 'border-primary bg-primary-soft' : 'border-border hover:border-primary/40'"
            @click="pickDiscount(d)"
          >
            <span class="font-semibold text-text">{{ d.name }}</span>
            <span class="font-bold text-primary">{{ d.type === 'percent' ? `${d.value}%` : `฿${d.value.toFixed(2)}` }}</span>
          </button>
        </div>
        <button v-if="cartStore.selectedDiscount" class="mt-3 w-full text-sm font-semibold text-danger hover:underline" @click="pickDiscount(null)">
          ไม่ใช้ส่วนลด
        </button>
      </div>
    </div>

    <CustomerPicker :open="showCustomers" @close="showCustomers = false" @pick="pickCustomer" />
    <PaymentModal :open="showPayment" @close="showPayment = false" @paid="receipt = $event" />
    <ReceiptModal :order="receipt?.order ?? null" :received="receipt?.received" :change="receipt?.change" @close="receipt = null" />
  </div>
</template>
