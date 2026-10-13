<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Receipt } from '@lucide/vue'
import { getDisplayChannel, type DisplayMessage } from '../../store/broadcast'
import { useAuthStore } from '../../store/modules/authStore'

const authStore = useAuthStore()
const state = ref<DisplayMessage>({ type: 'idle' })
const channel = getDisplayChannel()

function onMessage(event: MessageEvent<DisplayMessage>) {
  state.value = event.data
}

onMounted(() => channel?.addEventListener('message', onMessage))
onUnmounted(() => channel?.removeEventListener('message', onMessage))

const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
</script>

<template>
  <div class="flex h-screen flex-col bg-ink text-white">
    <header class="flex items-center justify-center gap-2 border-b border-white/10 py-5">
      <Receipt :size="22" />
      <h1 class="text-lg font-semibold">{{ authStore.shop?.name }}</h1>
    </header>

    <div v-if="state.type === 'paid'" class="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
      <p class="text-2xl font-bold text-success">ชำระเงินสำเร็จ</p>
      <p class="text-5xl font-extrabold">฿{{ baht(state.order.total) }}</p>
      <p v-if="state.change > 0" class="text-xl text-white/70">เงินทอน ฿{{ baht(state.change) }}</p>
      <p class="mt-4 text-white/50">ขอบคุณที่ใช้บริการ</p>
    </div>

    <div v-else-if="state.type === 'cart' && state.items.length" class="flex flex-1 flex-col overflow-hidden px-8 py-4">
      <ul class="flex-1 space-y-2 overflow-y-auto">
        <li v-for="(item, i) in state.items" :key="i" class="flex items-baseline justify-between border-b border-white/10 py-2 text-lg">
          <span>{{ item.name }} <span class="text-white/50">×{{ item.qty }}</span></span>
          <span class="font-semibold tabular-nums">฿{{ baht(item.price * item.qty) }}</span>
        </li>
      </ul>
      <div class="mt-4 space-y-1 border-t border-white/20 pt-4 text-white/70">
        <div class="flex justify-between"><span>ยอดรวม</span><span class="tabular-nums">฿{{ baht(state.subtotal) }}</span></div>
        <div v-if="state.discount > 0" class="flex justify-between"><span>ส่วนลด</span><span class="tabular-nums">−฿{{ baht(state.discount) }}</span></div>
        <div v-if="state.tax > 0" class="flex justify-between"><span>ภาษี</span><span class="tabular-nums">฿{{ baht(state.tax) }}</span></div>
        <div class="flex items-baseline justify-between pt-2 text-3xl font-extrabold text-white"><span>ยอดสุทธิ</span><span class="tabular-nums">฿{{ baht(state.total) }}</span></div>
      </div>
    </div>

    <div v-else class="flex flex-1 flex-col items-center justify-center gap-2 text-white/40">
      <Receipt :size="48" :stroke-width="1.2" />
      <p class="text-lg">ยินดีต้อนรับ</p>
    </div>
  </div>
</template>
