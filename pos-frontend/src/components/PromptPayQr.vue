<script setup lang="ts">
import { ref, watch } from 'vue'
import QRCode from 'qrcode'
import { paymentService } from '../api/services/paymentService'

const props = defineProps<{ amount: number }>()

const state = ref<'loading' | 'ready' | 'unset' | 'error'>('loading')
const image = ref('')
let requestId = 0

async function build() {
  const mine = (requestId += 1)
  if (!(props.amount > 0)) {
    state.value = 'error'
    return
  }
  state.value = 'loading'
  try {
    const { data } = await paymentService.promptPay(props.amount)
    if (mine !== requestId) return
    if (!data.data.configured || !data.data.payload) {
      state.value = 'unset'
      return
    }
    image.value = await QRCode.toDataURL(data.data.payload, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
    if (mine === requestId) state.value = 'ready'
  } catch {
    if (mine === requestId) state.value = 'error'
  }
}
watch(() => props.amount, build, { immediate: true })
</script>

<template>
  <div class="flex flex-col items-center rounded-2xl border border-border bg-white p-4">
    <img v-if="state === 'ready'" :src="image" alt="QR พร้อมเพย์" class="h-48 w-48" />
    <div v-else class="flex h-48 w-48 items-center justify-center px-2 text-center text-sm text-text-muted">
      <template v-if="state === 'loading'">กำลังสร้าง QR...</template>
      <template v-else-if="state === 'unset'">ร้านยังไม่ได้ตั้งเลขพร้อมเพย์<br />(ตั้งค่า &gt; ข้อมูลร้าน)</template>
      <template v-else>สร้าง QR ไม่สำเร็จ</template>
    </div>
    <p v-if="state === 'ready'" class="mt-2 text-xs text-text-muted">สแกนด้วยแอปธนาคาร · ฿{{ amount.toFixed(2) }}</p>
  </div>
</template>
