<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { toast } from 'vue-sonner'
import { Store, Mail, Lock, ShieldCheck } from '@lucide/vue'
import { useAuthStore } from '../../store/modules/authStore'

const router = useRouter()
const authStore = useAuthStore()
const submitting = ref(false)

const form = reactive({
  email: '',
  password: '',
})

async function submit() {
  if (!form.email.trim() || !form.password.trim()) {
    toast.error('กรุณากรอกข้อมูลให้ครบ')
    return
  }

  submitting.value = true
  try {
    await authStore.login({ email: form.email.trim(), password: form.password })
    toast.success(`ยินดีต้อนรับ ${authStore.user?.name ?? ''}`)
    router.push('/')
  } catch (error: unknown) {
    const message =
      (error as { response?: { data?: { message?: { message?: string } } } })?.response?.data?.message?.message
    toast.error(message ?? 'เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมลและรหัสผ่านอีกครั้ง')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen bg-bg">
    <!-- decorative side panel -->
    <div class="relative hidden flex-1 items-center justify-center overflow-hidden bg-ink lg:flex">
      <div class="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
      <div class="absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-primary-hover/20 blur-3xl" />
      <div class="relative z-10 max-w-sm px-10 text-center text-white">
        <Store class="mx-auto mb-6 h-12 w-12 text-primary" :stroke-width="1.5" />
        <h2 class="mb-3 text-2xl font-extrabold">ระบบ POS สำหรับร้านค้ายุคใหม่</h2>
        <p class="text-sm leading-relaxed text-white/60">
          จัดการการขาย สต็อก และรายงานได้ในที่เดียว เข้าสู่ระบบเพื่อกลับไปทำงานต่อ
        </p>
      </div>
    </div>

    <!-- form panel -->
    <div class="flex flex-1 items-center justify-center p-4">
      <div class="w-full max-w-sm">
        <div class="mb-8 flex items-center gap-2.5 lg:hidden">
          <Store class="h-6 w-6 text-primary" :stroke-width="2" />
          <span class="text-lg font-extrabold text-text">เข้าสู่ระบบ</span>
        </div>
        <h1 class="mb-1 hidden text-2xl font-extrabold text-text lg:block">เข้าสู่ระบบ</h1>
        <p class="mb-6 hidden text-sm text-text-muted lg:block">กรอกอีเมลและรหัสผ่านของร้านคุณ</p>

        <form class="space-y-4" @submit.prevent="submit">
          <div>
            <label class="mb-1 block text-sm font-semibold text-text">อีเมล</label>
            <div class="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-primary">
              <Mail class="h-4 w-4 shrink-0 text-text-muted" :stroke-width="1.75" />
              <input
                v-model="form.email"
                type="email"
                placeholder="owner@example.com"
                autocomplete="username"
                class="w-full py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label class="mb-1 block text-sm font-semibold text-text">รหัสผ่าน</label>
            <div class="flex items-center gap-2 rounded-xl border border-border px-3 focus-within:border-primary">
              <Lock class="h-4 w-4 shrink-0 text-text-muted" :stroke-width="1.75" />
              <input
                v-model="form.password"
                type="password"
                placeholder="••••••••"
                autocomplete="current-password"
                class="w-full py-2.5 text-sm outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            class="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
            :disabled="submitting"
          >
            {{ submitting ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ' }}
          </button>
        </form>

        <p class="mt-5 text-center text-sm text-text-muted">
          ยังไม่มีบัญชี?
          <RouterLink to="/register" class="font-semibold text-primary hover:underline">สมัครสมาชิก</RouterLink>
        </p>

        <div class="mt-8 flex items-start gap-2 rounded-xl bg-bg px-3 py-2.5 text-xs text-text-muted">
          <ShieldCheck class="h-4 w-4 shrink-0 text-success" :stroke-width="1.75" />
          <span>รหัสผ่านของคุณถูกเข้ารหัสและไม่สามารถดูได้โดยผู้อื่น</span>
        </div>
      </div>
    </div>
  </div>
</template>
