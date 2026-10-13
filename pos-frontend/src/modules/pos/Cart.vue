<script setup lang="ts">
import { Receipt, Minus, Plus } from '@lucide/vue'
import { useCartStore } from '../../store/modules/cartStore'

const cartStore = useCartStore()
</script>

<template>
  <div class="flex h-full flex-col rounded-3xl bg-surface">
    <div class="flex items-center justify-between px-5 pt-5">
      <div>
        <p class="text-xs font-semibold uppercase tracking-wide text-text-muted">บิลปัจจุบัน</p>
        <p class="text-lg font-bold text-text">#{{ 1024 }}</p>
      </div>
      <button
        v-if="cartStore.items.length"
        class="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger hover:bg-danger/20"
        @click="cartStore.clear()"
      >
        ล้างตะกร้า
      </button>
    </div>

    <div v-if="!cartStore.items.length" class="flex flex-1 flex-col items-center justify-center gap-2 text-text-muted">
      <Receipt class="h-10 w-10" :stroke-width="1.5" />
      <span class="text-sm">ยังไม่มีสินค้าในตะกร้า</span>
    </div>

    <ul v-else class="flex-1 overflow-y-auto px-5 py-3">
      <li
        v-for="item in cartStore.items"
        :key="item.productId"
        class="flex items-center gap-3 border-b border-dashed border-border py-3 last:border-none"
      >
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold text-text">{{ item.qty }}× {{ item.name }}</p>
          <p class="text-xs text-text-muted">฿{{ item.price.toFixed(0) }} / ชิ้น</p>
        </div>
        <div class="flex items-center gap-1 rounded-full bg-bg px-1 py-1">
          <button
            class="flex h-6 w-6 items-center justify-center rounded-full text-danger active:scale-90"
            @click="cartStore.decrementItem(item.productId)"
          >
            <Minus class="h-3.5 w-3.5" :stroke-width="2.5" />
          </button>
          <span class="w-4 text-center text-xs font-bold text-text">{{ item.qty }}</span>
          <button
            class="flex h-6 w-6 items-center justify-center rounded-full text-ink active:scale-90"
            @click="cartStore.incrementItem(item.productId)"
          >
            <Plus class="h-3.5 w-3.5" :stroke-width="2.5" />
          </button>
        </div>
        <span class="w-14 text-right text-sm font-bold text-text">
          {{ (item.price * item.qty).toFixed(0) }}
        </span>
      </li>
    </ul>

    <div class="space-y-1.5 border-t border-dashed border-border px-5 py-4 text-sm text-text-muted">
      <div class="flex justify-between">
        <span>ยอดรวม</span>
        <span>฿{{ cartStore.subtotal.toFixed(2) }}</span>
      </div>
      <div class="flex justify-between">
        <span>ส่วนลด<template v-if="cartStore.selectedDiscount"> ({{ cartStore.selectedDiscount.name }})</template></span>
        <span>−฿{{ cartStore.ruleDiscount.toFixed(2) }}</span>
      </div>
      <div v-if="cartStore.pointsUsed > 0" class="flex justify-between text-primary">
        <span>ใช้แต้ม {{ cartStore.pointsUsed }} แต้ม</span>
        <span>−฿{{ cartStore.pointsDiscount.toFixed(2) }}</span>
      </div>
      <div v-if="cartStore.taxSettings?.enabled" class="flex justify-between">
        <span>{{ cartStore.taxSettings.name }} {{ cartStore.taxSettings.rate }}% {{ cartStore.taxSettings.isInclusive ? '(รวมในราคา)' : '(บวกเพิ่ม)' }}</span>
        <span>฿{{ cartStore.tax.toFixed(2) }}</span>
      </div>
      <div class="flex items-baseline justify-between pt-1 text-text">
        <span class="text-sm font-semibold">ยอดสุทธิ</span>
        <span class="text-2xl font-extrabold">฿{{ cartStore.total.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>
