<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Store } from '@lucide/vue'
import { useAuthStore } from '../../store/modules/authStore'

const router = useRouter()
const authStore = useAuthStore()
const submitting = ref(false)

const shopTypes = [
  { value: 'restaurant', label: 'ร้านอาหาร' },
  { value: 'retail', label: 'ร้านค้าปลีก' },
  { value: 'cafe', label: 'คาเฟ่' },
  { value: 'salon', label: 'ร้านทำผม' },
  { value: 'nail', label: 'ร้านทำเล็บ' },
] as const

const form = reactive({
  shopName: '',
  type: 'restaurant' as (typeof shopTypes)[number]['value'],
  hasDineIn: false,
  phone: '',
  address: '',
  logoAbbr: '',
})

async function submit() {
  if (!form.shopName.trim()) {
    toast.error('กรุณาใส่ชื่อร้าน')
    return
  }

  submitting.value = true
  try {
    await authStore.setupShop({
      shopName: form.shopName.trim(),
      type: form.type,
      hasDineIn: form.hasDineIn,
      phone: form.phone || undefined,
      address: form.address || undefined,
      logoAbbr: form.logoAbbr || undefined,
    })
    toast.success('ตั้งค่าร้านสำเร็จ!')
    router.push('/')
  } catch (error: unknown) {
    const message =
      (error as { response?: { data?: { message?: { message?: string } } } })?.response?.data?.message?.message
    toast.error(message ?? 'ตั้งค่าร้านไม่สำเร็จ ลองใหม่อีกครั้ง')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg p-4">
    <div class="w-full max-w-lg rounded-3xl bg-surface p-8 shadow-sm">
      <div class="mb-6 flex items-center gap-2">
        <Store class="h-7 w-7 text-primary" :stroke-width="2" />
        <span class="text-lg font-extrabold text-text">ตั้งค่าร้านค้าของคุณ</span>
      </div>
      <p class="-mt-4 mb-6 text-sm text-text-muted">เพิ่มเมนูและสินค้าได้ภายหลังในหน้าเมนูและโปรโมชั่น</p>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1 block text-sm font-semibold text-text">ชื่อร้าน</label>
          <input
            v-model="form.shopName"
            type="text"
            placeholder="เช่น Morning Sourdough"
            class="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        <div>
          <label class="mb-2 block text-sm font-semibold text-text">ประเภทร้าน</label>
          <div class="grid grid-cols-3 gap-2">
            <button
              v-for="opt in shopTypes"
              :key="opt.value"
              type="button"
              class="rounded-xl border-2 px-3 py-2 text-sm font-medium transition"
              :class="
                form.type === opt.value
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-border text-text-muted hover:border-primary/40'
              "
              @click="form.type = opt.value"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>

        <label class="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span class="text-sm font-medium text-text">มีโต๊ะนั่งทานในร้าน (dine-in)</span>
          <input v-model="form.hasDineIn" type="checkbox" class="h-5 w-5 accent-primary" />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <input
            v-model="form.phone"
            type="text"
            placeholder="เบอร์โทรร้าน"
            class="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            v-model="form.logoAbbr"
            type="text"
            maxlength="3"
            placeholder="อักษรย่อ (เช่น MS)"
            class="rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>
        <input
          v-model="form.address"
          type="text"
          placeholder="ที่อยู่ร้าน"
          class="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary"
        />

        <button
          type="submit"
          class="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
          :disabled="submitting"
        >
          {{ submitting ? 'กำลังบันทึก...' : 'เสร็จสิ้น' }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-text-muted">
        มีร้านอยู่แล้ว?
        <RouterLink to="/login" class="font-semibold text-primary hover:underline">เข้าสู่ระบบ</RouterLink>
      </p>
    </div>
  </div>
</template>
