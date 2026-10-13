<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { Plus, Search, Pencil, Trash2, X } from '@lucide/vue'
import { customerService, type Customer, type CustomerDetail, type CustomerInput } from '../../api/services/customerService'
import { errorMessage } from '../../store/modules/productStore'
import { useAuthStore } from '../../store/modules/authStore'
import PaginationBar from '../../components/PaginationBar.vue'

const authStore = useAuthStore()
const canManage = computed(() => authStore.user?.role === 'owner' || authStore.user?.role === 'manager')

const customers = ref<Customer[]>([])
const loading = ref(true)
const search = ref('')
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
let requestId = 0

async function load() {
  const mine = (requestId += 1)
  loading.value = true
  try {
    const { data } = await customerService.list({ page: page.value, pageSize: pageSize.value, search: search.value.trim() })
    if (mine !== requestId) return
    customers.value = data.data.items
    total.value = data.data.total
    if (page.value > data.data.totalPages) {
      page.value = data.data.totalPages
      await load()
    }
  } catch (error: unknown) {
    if (mine === requestId) toast.error(errorMessage(error, 'โหลดรายชื่อลูกค้าไม่สำเร็จ'))
  } finally {
    if (mine === requestId) loading.value = false
  }
}
const debouncedSearch = useDebounceFn(() => {
  page.value = 1
  void load()
}, 300)
watch(search, () => void debouncedSearch())
watch([page, pageSize], () => void load())
onMounted(load)

// ---- add / edit
const showForm = ref(false)
const editingId = ref<number | null>(null)
const saving = ref(false)
const form = reactive<CustomerInput>({ name: '', phone: '', note: '' })
const inputClass = 'w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary'

function openCreate() {
  editingId.value = null
  Object.assign(form, { name: '', phone: '', note: '' })
  showForm.value = true
}
function openEdit(c: Customer) {
  editingId.value = c.id
  Object.assign(form, { name: c.name, phone: c.phone, note: c.note })
  showForm.value = true
}
async function save() {
  if (!form.name.trim()) {
    toast.error('กรุณาใส่ชื่อลูกค้า')
    return
  }
  saving.value = true
  try {
    if (editingId.value === null) await customerService.create({ ...form })
    else await customerService.update(editingId.value, { ...form })
    toast.success(editingId.value === null ? 'เพิ่มลูกค้าแล้ว' : 'แก้ไขลูกค้าแล้ว')
    showForm.value = false
    if (detail.value) await openDetail(detail.value.id)
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'บันทึกลูกค้าไม่สำเร็จ'))
  } finally {
    saving.value = false
  }
}
async function remove(c: Customer) {
  if (!confirm(`ลบ "${c.name}" ใช่ไหม? ประวัติแต้มของลูกค้าคนนี้จะถูกลบด้วย (บิลเก่ายังอยู่)`)) return
  try {
    await customerService.remove(c.id)
    toast.success('ลบลูกค้าแล้ว')
    if (detail.value?.id === c.id) detail.value = null
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ลบลูกค้าไม่สำเร็จ'))
  }
}

// ---- detail panel
const detail = ref<CustomerDetail | null>(null)
const adjustPoints = ref<number | null>(null)
const adjustReason = ref('')
const typeLabel = { earn: 'ได้รับแต้ม', redeem: 'ใช้แต้ม', reverse_earn: 'หักแต้มคืน (ยกเลิกบิล)', refund_redeem: 'คืนแต้ม (ยกเลิกบิล)', adjust: 'ปรับแต้ม' } as const

async function openDetail(id: number) {
  try {
    detail.value = (await customerService.detail(id)).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดข้อมูลลูกค้าไม่สำเร็จ'))
  }
}
const recalculating = ref(false)
async function recalculate() {
  if (!detail.value) return
  recalculating.value = true
  try {
    const { data } = await customerService.recalculatePoints(detail.value.id)
    const r = data.data
    if (r.orders === 0) toast.info('ไม่มีบิลที่ต้องคำนวณแต้มเพิ่ม')
    else toast.success(`คำนวณแต้มจาก ${r.orders} บิล เพิ่ม ${r.points} แต้ม`)
    await openDetail(detail.value.id)
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'คำนวณแต้มไม่สำเร็จ'))
  } finally {
    recalculating.value = false
  }
}

async function submitAdjust() {
  if (!detail.value || !adjustPoints.value || !adjustReason.value.trim()) {
    toast.error('กรุณาใส่จำนวนแต้ม (บวกหรือลบ) และเหตุผล')
    return
  }
  try {
    detail.value = (await customerService.adjustPoints(detail.value.id, adjustPoints.value, adjustReason.value.trim())).data.data
    adjustPoints.value = null
    adjustReason.value = ''
    toast.success('ปรับแต้มแล้ว')
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ปรับแต้มไม่สำเร็จ'))
  }
}
const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <h1 class="text-base font-bold text-text">ลูกค้าและสมาชิก</h1>
      <button class="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover" @click="openCreate">
        <Plus :size="16" /> เพิ่มลูกค้า
      </button>
    </header>

    <div class="flex flex-1 gap-4 overflow-hidden p-6">
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <div class="relative border-b border-border p-3">
          <Search :size="16" class="absolute left-6 top-1/2 -translate-y-1/2 text-text-muted" />
          <input v-model="search" type="text" placeholder="ค้นหาชื่อหรือเบอร์โทร" class="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-sm">
            <thead class="sticky top-0 bg-surface text-left text-xs text-text-muted">
              <tr><th class="px-4 py-3">ชื่อ</th><th class="px-4 py-3">เบอร์โทร</th><th class="px-4 py-3 text-right">แต้ม</th><th class="px-4 py-3" /></tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="c in customers" :key="c.id" class="cursor-pointer hover:bg-bg" :class="detail?.id === c.id ? 'bg-primary-soft/40' : ''" @click="openDetail(c.id)">
                <td class="px-4 py-3 font-medium text-text">{{ c.name }}</td>
                <td class="px-4 py-3 text-text-muted">{{ c.phone || '—' }}</td>
                <td class="px-4 py-3 text-right font-semibold text-primary">{{ c.points.toLocaleString('th-TH') }}</td>
                <td class="px-4 py-3 text-right" @click.stop>
                  <template v-if="canManage">
                    <button class="mr-2 text-text-muted hover:text-primary" title="แก้ไข" @click="openEdit(c)"><Pencil :size="16" /></button>
                    <button class="text-text-muted hover:text-danger" title="ลบ" @click="remove(c)"><Trash2 :size="16" /></button>
                  </template>
                </td>
              </tr>
              <tr v-if="!loading && !customers.length">
                <td colspan="4" class="py-12 text-center text-text-muted">{{ search ? 'ไม่พบลูกค้าที่ค้นหา' : 'ยังไม่มีลูกค้า กด "เพิ่มลูกค้า" เพื่อเริ่มต้น' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationBar v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>

      <aside v-if="detail" class="w-80 shrink-0 overflow-y-auto rounded-2xl border border-border bg-surface p-5">
        <div class="mb-3 flex items-start justify-between">
          <div>
            <p class="text-base font-bold text-text">{{ detail.name }}</p>
            <p class="text-sm text-text-muted">{{ detail.phone || 'ไม่มีเบอร์โทร' }}</p>
          </div>
          <button class="text-text-muted hover:text-text" @click="detail = null"><X :size="18" /></button>
        </div>
        <p v-if="detail.note" class="mb-3 rounded-xl bg-bg p-2.5 text-sm text-ink-soft">{{ detail.note }}</p>
        <div class="mb-4 grid grid-cols-3 gap-2 text-center">
          <div class="rounded-xl bg-primary-soft p-2"><p class="text-lg font-bold text-primary">{{ detail.points.toLocaleString('th-TH') }}</p><p class="text-[11px] text-text-muted">แต้ม</p></div>
          <div class="rounded-xl bg-bg p-2"><p class="text-lg font-bold text-text">{{ detail.billCount }}</p><p class="text-[11px] text-text-muted">บิล</p></div>
          <div class="rounded-xl bg-bg p-2"><p class="text-sm font-bold leading-7 text-text">฿{{ detail.totalSpent.toLocaleString('th-TH') }}</p><p class="text-[11px] text-text-muted">ยอดซื้อรวม</p></div>
        </div>

        <button
          v-if="canManage"
          class="mb-3 w-full rounded-xl border border-primary py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-50"
          :disabled="recalculating"
          title="เพิ่มแต้มให้บิลเก่าที่ยังไม่เคยได้แต้ม ตามอัตราที่ตั้งไว้ในปัจจุบัน"
          @click="recalculate"
        >
          {{ recalculating ? 'กำลังคำนวณ...' : 'คำนวณแต้มจากบิลเก่าอัตโนมัติ' }}
        </button>

        <form v-if="canManage" class="mb-4 space-y-2" @submit.prevent="submitAdjust">
          <p class="text-xs font-semibold text-text-muted">ปรับแต้มด้วยมือ</p>
          <div class="flex gap-2">
            <input v-model.number="adjustPoints" type="number" placeholder="+50 / -20" class="w-24 rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary" />
            <input v-model="adjustReason" type="text" maxlength="200" placeholder="เหตุผล" class="min-w-0 flex-1 rounded-lg border border-border px-2.5 py-1.5 text-sm outline-none focus:border-primary" />
          </div>
          <button type="submit" class="w-full rounded-lg bg-primary-soft py-1.5 text-sm font-semibold text-primary">ปรับแต้ม</button>
        </form>

        <p class="mb-1 text-xs font-semibold text-text-muted">ประวัติแต้มล่าสุด</p>
        <ul class="mb-4 divide-y divide-border text-sm">
          <li v-for="h in detail.pointHistory" :key="h.id" class="py-2">
            <div class="flex justify-between">
              <span class="text-text">{{ typeLabel[h.type] }}</span>
              <span class="font-semibold" :class="h.points >= 0 ? 'text-success' : 'text-danger'">{{ h.points > 0 ? '+' : '' }}{{ h.points }}</span>
            </div>
            <div class="flex justify-between text-xs text-text-muted">
              <span>{{ h.note || new Date(h.createdAt).toLocaleString('th-TH') }}</span><span>คงเหลือ {{ h.balanceAfter }}</span>
            </div>
          </li>
          <li v-if="!detail.pointHistory.length" class="py-3 text-text-muted">ยังไม่มีประวัติ</li>
        </ul>

        <p class="mb-1 text-xs font-semibold text-text-muted">บิลล่าสุด</p>
        <ul class="divide-y divide-border text-sm">
          <li v-for="o in detail.recentOrders" :key="o.id" class="flex justify-between py-2">
            <span class="text-text">{{ o.orderNumber }}</span><span class="text-ink-soft">฿{{ baht(o.total) }}</span>
          </li>
          <li v-if="!detail.recentOrders.length" class="py-3 text-text-muted">ยังไม่มีบิล</li>
        </ul>
      </aside>
    </div>

    <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <form class="w-full max-w-sm space-y-3 rounded-3xl bg-surface p-6 shadow-xl" @submit.prevent="save">
        <h2 class="text-lg font-bold text-text">{{ editingId === null ? 'เพิ่มลูกค้า' : 'แก้ไขลูกค้า' }}</h2>
        <div><label class="mb-1 block text-xs font-semibold text-text-muted">ชื่อ *</label><input v-model="form.name" type="text" maxlength="100" :class="inputClass" /></div>
        <div><label class="mb-1 block text-xs font-semibold text-text-muted">เบอร์โทร (ไม่ซ้ำกันในร้าน)</label><input v-model="form.phone" type="tel" inputmode="tel" maxlength="20" :class="inputClass" /></div>
        <div><label class="mb-1 block text-xs font-semibold text-text-muted">หมายเหตุ</label><input v-model="form.note" type="text" maxlength="300" :class="inputClass" /></div>
        <div class="flex gap-2 pt-1">
          <button type="button" class="flex-1 rounded-xl border border-border py-2.5 text-sm text-ink-soft" @click="showForm = false">ยกเลิก</button>
          <button type="submit" class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving">บันทึก</button>
        </div>
      </form>
    </div>
  </div>
</template>
