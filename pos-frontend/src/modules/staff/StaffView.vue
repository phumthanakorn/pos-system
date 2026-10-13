<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, KeyRound, UserX, UserCheck } from '@lucide/vue'
import { staffService, type CreateStaffInput, type StaffRole, type StaffView } from '../../api/services/staffService'
import { errorMessage } from '../../store/modules/productStore'
import { useAuthStore } from '../../store/modules/authStore'

const authStore = useAuthStore()
const staff = ref<StaffView[]>([])
const loading = ref(true)
const saving = ref(false)

const roleLabel: Record<StaffRole, string> = { owner: 'เจ้าของร้าน', manager: 'ผู้จัดการ', cashier: 'แคชเชียร์' }
const roleBadge: Record<StaffRole, string> = {
  owner: 'bg-primary-soft text-primary',
  manager: 'bg-warning/15 text-warning',
  cashier: 'bg-bg text-text-muted',
}

const isOwner = computed(() => authStore.user?.role === 'owner')
const assignableRoles = computed<('manager' | 'cashier')[]>(() => (isOwner.value ? ['cashier', 'manager'] : ['cashier']))

function canManage(target: StaffView): boolean {
  if (target.role === 'owner' || target.id === authStore.user?.id) return false
  return isOwner.value || target.role === 'cashier'
}

async function load() {
  try {
    staff.value = (await staffService.list()).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดรายชื่อพนักงานไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const showCreate = ref(false)
const form = reactive<CreateStaffInput>({ name: '', email: '', username: '', password: '', role: 'cashier' })

function openCreate() {
  Object.assign(form, { name: '', email: '', username: '', password: '', role: 'cashier' })
  showCreate.value = true
}

async function create() {
  if (!form.name.trim() || !form.email.trim() || !form.username.trim()) {
    toast.error('กรุณากรอกข้อมูลให้ครบ')
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
  saving.value = true
  try {
    const { data } = await staffService.create({ ...form })
    staff.value.push(data.data)
    showCreate.value = false
    toast.success('เพิ่มพนักงานแล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'เพิ่มพนักงานไม่สำเร็จ'))
  } finally {
    saving.value = false
  }
}

function replace(updated: StaffView) {
  staff.value = staff.value.map((s) => (s.id === updated.id ? updated : s))
}

async function changeRole(member: StaffView, role: 'manager' | 'cashier') {
  try {
    replace((await staffService.update(member.id, { role })).data.data)
    toast.success('เปลี่ยนระดับสิทธิ์แล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'เปลี่ยนสิทธิ์ไม่สำเร็จ'))
    await load()
  }
}

async function toggleActive(member: StaffView) {
  const next = !member.isActive
  if (!next && !confirm(`ปิดบัญชีของ "${member.name}"? เขาจะเข้าสู่ระบบไม่ได้อีก (ประวัติการขายยังอยู่)`)) return
  try {
    replace((await staffService.update(member.id, { isActive: next })).data.data)
    toast.success(next ? 'เปิดบัญชีแล้ว' : 'ปิดบัญชีแล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'เปลี่ยนสถานะไม่สำเร็จ'))
  }
}

async function resetPassword(member: StaffView) {
  const password = window.prompt(`ตั้งรหัสผ่านใหม่ให้ "${member.name}" (อย่างน้อย 6 ตัวอักษร)`)
  if (password === null) return
  if (password.length < 6) {
    toast.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
    return
  }
  try {
    await staffService.update(member.id, { password })
    toast.success('ตั้งรหัสผ่านใหม่แล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ตั้งรหัสผ่านไม่สำเร็จ'))
  }
}

const inputClass = 'w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary'
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div>
        <h1 class="text-base font-bold text-text">พนักงาน</h1>
        <p class="text-xs text-text-muted">{{ staff.length }} บัญชี</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" :stroke-width="2.5" />
        เพิ่มพนักงาน
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <p v-if="loading" class="text-sm text-text-muted">กำลังโหลด...</p>
      <div v-else class="overflow-hidden rounded-2xl border border-border bg-surface">
        <table class="w-full text-left text-sm">
          <thead class="bg-bg text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th class="px-4 py-3">ชื่อ</th>
              <th class="px-4 py-3">อีเมลเข้าสู่ระบบ</th>
              <th class="px-4 py-3">สิทธิ์</th>
              <th class="px-4 py-3">สถานะ</th>
              <th class="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="member in staff" :key="member.id" :class="member.isActive ? '' : 'opacity-60'">
              <td class="px-4 py-3 font-semibold text-text">
                {{ member.name }}
                <span v-if="member.id === authStore.user?.id" class="ml-1 text-xs font-normal text-text-muted">(คุณ)</span>
              </td>
              <td class="px-4 py-3 text-text-muted">{{ member.email }}</td>
              <td class="px-4 py-3">
                <select
                  v-if="canManage(member)"
                  :value="member.role"
                  class="rounded-lg border border-border px-2 py-1 text-xs font-semibold outline-none"
                  @change="changeRole(member, ($event.target as HTMLSelectElement).value as 'manager' | 'cashier')"
                >
                  <option v-for="r in assignableRoles" :key="r" :value="r">{{ roleLabel[r] }}</option>
                </select>
                <span v-else class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="roleBadge[member.role]">
                  {{ roleLabel[member.role] }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="member.isActive ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'"
                >
                  {{ member.isActive ? 'ใช้งาน' : 'ปิดบัญชี' }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <template v-if="canManage(member)">
                  <button class="mr-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline" @click="resetPassword(member)">
                    <KeyRound class="h-3.5 w-3.5" :stroke-width="2" /> ตั้งรหัสผ่านใหม่
                  </button>
                  <button
                    class="inline-flex items-center gap-1 text-xs font-semibold hover:underline"
                    :class="member.isActive ? 'text-danger' : 'text-success'"
                    @click="toggleActive(member)"
                  >
                    <component :is="member.isActive ? UserX : UserCheck" class="h-3.5 w-3.5" :stroke-width="2" />
                    {{ member.isActive ? 'ปิดบัญชี' : 'เปิดบัญชี' }}
                  </button>
                </template>
                <span v-else class="text-xs text-text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <form class="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl" @submit.prevent="create">
        <h2 class="mb-4 text-lg font-bold text-text">เพิ่มพนักงาน</h2>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">ชื่อ-นามสกุล</label>
            <input v-model="form.name" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">อีเมล (ใช้เข้าสู่ระบบ)</label>
            <input v-model="form.email" type="email" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">ชื่อผู้ใช้</label>
            <input v-model="form.username" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">รหัสผ่านเริ่มต้น (อย่างน้อย 6 ตัว)</label>
            <input v-model="form.password" type="password" autocomplete="new-password" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">สิทธิ์</label>
            <select v-model="form.role" :class="inputClass">
              <option v-for="r in assignableRoles" :key="r" :value="r">{{ roleLabel[r] }}</option>
            </select>
            <p class="mt-1 text-xs text-text-muted">
              แคชเชียร์: ขายและเปิด/ปิดกะได้ · ผู้จัดการ: แก้เมนู สต็อก ตั้งค่า และดูแลแคชเชียร์ได้เพิ่ม
            </p>
          </div>
        </div>
        <div class="mt-5 flex gap-3">
          <button type="button" class="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted hover:bg-bg" @click="showCreate = false">ยกเลิก</button>
          <button type="submit" class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50" :disabled="saving">
            {{ saving ? 'กำลังบันทึก...' : 'เพิ่มพนักงาน' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
