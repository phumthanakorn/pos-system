<script setup lang="ts">
import { ref, watch } from 'vue'
import { Printer, X } from '@lucide/vue'
import type { OrderView } from '../api/services/orderService'
import { settingsService, type ReceiptOptions, type ShopSettings } from '../api/services/settingsService'
import { useAuthStore } from '../store/modules/authStore'
import ReceiptPaper from './ReceiptPaper.vue'

const props = defineProps<{ order: OrderView | null; received?: number; change?: number }>()
const emit = defineEmits<{ close: [] }>()
const authStore = useAuthStore()

const DEFAULT_OPTIONS: ReceiptOptions = {
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showTaxId: true,
  showOrderNumber: true,
  showUnitPrice: true,
  paperWidth: 80,
  headerNote: '',
}
const shop = ref<ShopSettings | null>(null)
const options = ref<ReceiptOptions>(DEFAULT_OPTIONS)

// Shop details and the receipt template come from settings; if the current role may not read them,
// the receipt still renders with the shop name and default layout.
watch(
  () => props.order,
  async (order) => {
    if (!order) return
    try {
      const data = (await settingsService.get()).data.data
      shop.value = data.shop
      options.value = data.receipt
    } catch {
      /* keep defaults */
    }
  },
)
const print = () => window.print()
</script>

<template>
  <div v-if="order" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/60 p-4 sm:items-center">
    <div class="w-full max-w-[360px]">
      <ReceiptPaper :order="order" :shop="shop" :options="options" :shop-name="authStore.shop?.name" :received="received" :change="change" for-print />

      <div class="mt-4 flex gap-2 print:hidden">
        <button class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-ink-soft hover:bg-bg" @click="emit('close')">
          <X :size="16" /> ปิด
        </button>
        <button class="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover" @click="print">
          <Printer :size="16" /> พิมพ์ใบเสร็จ
        </button>
      </div>
    </div>
  </div>
</template>
