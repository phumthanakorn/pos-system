<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Store, User, Mail, AtSign, Lock } from '@lucide/vue'
import { useAuthStore } from '../../store/modules/authStore'

const router = useRouter()
const authStore = useAuthStore()
const submitting = ref(false)

const form = reactive({
  name: '',
  email: '',
  username: '',
  password: '',
  confirmPassword: '',
  acceptedTerms: false,
})

async function submit() {
  if (!form.name.trim() || !form.email.trim() || !form.username.trim()) {
    toast.error('กรุณากรอกข้อมูลให้ครบ')
    return
  }
  if (!form.acceptedTerms) {
    toast.error('กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัวก่อนสมัคร')
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    toast.error('กรุณาใส่อีเมลให้ถูกต้อง')
    return
  }
  if (form.password.length < 6) {
    toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    return
  }
  if (form.password !== form.confirmPassword) {
    toast.error('รหัสผ่านไม่ตรงกัน')
    return
  }

  submitting.value = true
  try {
    await authStore.register({
      name: form.name.trim(),
      email: form.email.trim(),
      username: form.username.trim(),
      password: form.password,
    })
    toast.success('สมัครสมาชิกสำเร็จ กรุณาเข้าสู่ระบบ')
    router.push('/login')
  } catch (error: unknown) {
    const message =
      (error as { response?: { data?: { message?: { message?: string } } } })?.response?.data?.message?.message
    toast.error(message ?? 'สมัครสมาชิกไม่สำเร็จ ลองใหม่อีกครั้ง')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-bg p-4">
    <div class="w-full max-w-sm rounded-3xl bg-surface p-8 shadow-sm">
      <div class="mb-6 flex items-center gap-2.5">
        <Store class="h-7 w-7 text-primary" :stroke-width="2" />
        <span class="text-lg font-extrabold text-text">สมัครสมาชิก</span>
      </div>
      <p class="-mt-4 mb-6 text-sm text-text-muted">สร้างบัญชีผู้ใช้ก่อน แล้วค่อยเข้าสู่ระบบเพื่อตั้งค่าร้าน</p>

      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="mb-1 block text-sm font-semibold text-text">ชื่อ-นามสกุล</label>
          <div class="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-primary">
            <User class="h-4 w-4 shrink-0 text-text-muted" :stroke-width="1.75" />
            <input v-model="form.name" type="text" class="w-full py-2.5 text-sm outline-none" />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-semibold text-text">อีเมล</label>
          <div class="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-primary">
            <Mail class="h-4 w-4 shrink-0 text-text-muted" :stroke-width="1.75" />
            <input
              v-model="form.email"
              type="email"
              placeholder="owner@example.com"
              autocomplete="email"
              class="w-full py-2.5 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-semibold text-text">ชื่อผู้ใช้ (username)</label>
          <div class="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-primary">
            <AtSign class="h-4 w-4 shrink-0 text-text-muted" :stroke-width="1.75" />
            <input v-model="form.username" type="text" class="w-full py-2.5 text-sm outline-none" />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-semibold text-text">รหัสผ่าน</label>
          <div class="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-primary">
            <Lock class="h-4 w-4 shrink-0 text-text-muted" :stroke-width="1.75" />
            <input
              v-model="form.password"
              type="password"
              placeholder="อย่างน้อย 6 ตัวอักษร"
              autocomplete="new-password"
              class="w-full py-2.5 text-sm outline-none"
            />
          </div>
        </div>

        <div>
          <label class="mb-1 block text-sm font-semibold text-text">ยืนยันรหัสผ่าน</label>
          <div class="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-primary">
            <Lock class="h-4 w-4 shrink-0 text-text-muted" :stroke-width="1.75" />
            <input
              v-model="form.confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full py-2.5 text-sm outline-none"
            />
          </div>
        </div>

        <label class="flex items-start gap-2.5 text-xs leading-relaxed text-text-muted">
          <input v-model="form.acceptedTerms" type="checkbox" class="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
          <span>
            ฉันได้อ่านและยอมรับ
            <a href="#" class="font-semibold text-primary hover:underline">ข้อกำหนดการใช้งาน</a>
            และ
            <a href="#" class="font-semibold text-primary hover:underline">นโยบายความเป็นส่วนตัว (PDPA)</a>
          </span>
        </label>

        <button
          type="submit"
          class="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
          :disabled="submitting"
        >
          {{ submitting ? 'กำลังสมัคร...' : 'สมัครสมาชิก' }}
        </button>
      </form>

      <p class="mt-5 text-center text-sm text-text-muted">
        มีบัญชีอยู่แล้ว?
        <RouterLink to="/login" class="font-semibold text-primary hover:underline">เข้าสู่ระบบ</RouterLink>
      </p>
    </div>
  </div>
</template>
