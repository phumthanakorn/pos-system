<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Plus, Pencil, Trash2, Percent, BadgeDollarSign } from '@lucide/vue'
import { discountService, type DiscountInput, type DiscountView } from '../../api/services/discountService'
import { errorMessage } from '../../store/modules/productStore'

const discounts = ref<DiscountView[]>([])
const loading = ref(true)
const saving = ref(false)
const showModal = ref(false)
const editingId = ref<number | null>(null)

const emptyForm = (): DiscountInput => ({ name: '', type: 'percent', value: 10, isActive: true, managerOnly: false, startsAt: null, endsAt: null })
const form = reactive<DiscountInput>(emptyForm())
// <input type="date"> works with YYYY-MM-DD; the server stores a full timestamp
const startsDate = ref('')
const endsDate = ref('')

const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : '')
const inputClass = 'w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary'

async function load() {
  try {
    discounts.value = (await discountService.list()).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดส่วนลดไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}
onMounted(load)

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  startsDate.value = ''
  endsDate.value = ''
  showModal.value = true
}

function openEdit(d: DiscountView) {
  editingId.value = d.id
  Object.assign(form, { name: d.name, type: d.type, value: d.value, isActive: d.isActive, managerOnly: d.managerOnly })
  startsDate.value = toDateInput(d.startsAt)
  endsDate.value = toDateInput(d.endsAt)
  showModal.value = true
}

function status(d: DiscountView): { label: string; cls: string } {
  const now = Date.now()
  if (!d.isActive) return { label: 'ปิดใช้งาน', cls: 'bg-bg text-text-muted' }
  if (d.startsAt && new Date(d.startsAt).getTime() > now) return { label: 'ยังไม่เริ่ม', cls: 'bg-warning/15 text-warning' }
  if (d.endsAt && new Date(d.endsAt).getTime() < now) return { label: 'หมดอายุ', cls: 'bg-danger/10 text-danger' }
  return { label: 'ใช้งานอยู่', cls: 'bg-success/10 text-success' }
}

async function save() {
  if (!form.name.trim()) {
    toast.error('กรุณาใส่ชื่อส่วนลด')
    return
  }
  if (!(form.value > 0)) {
    toast.error('มูลค่าส่วนลดต้องมากกว่า 0')
    return
  }
  if (form.type === 'percent' && form.value > 100) {
    toast.error('ส่วนลดเปอร์เซ็นต์ต้องไม่เกิน 100')
    return
  }
  if (startsDate.value && endsDate.value && endsDate.value < startsDate.value) {
    toast.error('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม')
    return
  }
  const payload: DiscountInput = {
    ...form,
    startsAt: startsDate.value ? `${startsDate.value}T00:00:00+07:00` : null,
    // end of the chosen day in Thai time, so "ถึงวันที่ 31" includes the 31st
    endsAt: endsDate.value ? `${endsDate.value}T23:59:59+07:00` : null,
  }
  saving.value = true
  try {
    if (editingId.value !== null) {
      const { data } = await discountService.update(editingId.value, payload)
      discounts.value = discounts.value.map((d) => (d.id === editingId.value ? data.data : d))
    } else {
      discounts.value.push((await discountService.create(payload)).data.data)
    }
    showModal.value = false
    toast.success('บันทึกส่วนลดแล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'บันทึกส่วนลดไม่สำเร็จ'))
  } finally {
    saving.value = false
  }
}

async function toggle(d: DiscountView) {
  try {
    const { data } = await discountService.update(d.id, { isActive: !d.isActive })
    discounts.value = discounts.value.map((x) => (x.id === d.id ? data.data : x))
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'เปลี่ยนสถานะไม่สำเร็จ'))
  }
}

async function remove(d: DiscountView) {
  if (!confirm(`ลบส่วนลด "${d.name}"? บิลที่เคยใช้ส่วนลดนี้ยังคงข้อมูลเดิม`)) return
  try {
    await discountService.remove(d.id)
    discounts.value = discounts.value.filter((x) => x.id !== d.id)
    toast.success('ลบส่วนลดแล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ลบส่วนลดไม่สำเร็จ'))
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div>
        <h1 class="text-base font-bold text-text">ส่วนลดและโปรโมชั่น</h1>
        <p class="text-xs text-text-muted">แคชเชียร์เลือกใช้ได้เฉพาะรายการที่นี่ ตั้งหรือแก้เองไม่ได้</p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" :stroke-width="2.5" /> เพิ่มส่วนลด
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <p v-if="loading" class="text-sm text-text-muted">กำลังโหลด...</p>
      <div v-else-if="!discounts.length" class="flex flex-col items-center rounded-3xl border border-dashed border-border bg-surface py-16 text-center">
        <span class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Percent class="h-7 w-7" :stroke-width="1.75" />
        </span>
        <p class="font-semibold text-text">ยังไม่มีส่วนลด</p>
        <p class="mt-1 text-sm text-text-muted">เพิ่มส่วนลดแรก เช่น ลด 10% หรือลด 50 บาท</p>
      </div>

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
        <div v-for="d in discounts" :key="d.id" class="group rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div class="flex items-start justify-between gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <component :is="d.type === 'percent' ? Percent : BadgeDollarSign" class="h-5 w-5" :stroke-width="1.75" />
            </span>
            <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="status(d).cls">{{ status(d).label }}</span>
          </div>
          <p class="mt-4 truncate text-base font-bold text-text">{{ d.name }}</p>
          <p v-if="d.managerOnly" class="text-xs text-warning">เฉพาะผู้จัดการ/เจ้าของ</p>
          <p class="text-2xl font-extrabold text-primary">
            {{ d.type === 'percent' ? `${d.value}%` : `฿${d.value.toFixed(2)}` }}
          </p>
          <p class="mt-1 text-xs text-text-muted">
            <template v-if="d.startsAt || d.endsAt">
              {{ d.startsAt ? new Date(d.startsAt).toLocaleDateString('th-TH') : 'เริ่มทันที' }} –
              {{ d.endsAt ? new Date(d.endsAt).toLocaleDateString('th-TH') : 'ไม่มีกำหนดสิ้นสุด' }}
            </template>
            <template v-else>ไม่จำกัดช่วงเวลา</template>
          </p>
          <div class="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs font-semibold">
            <button class="text-text-muted hover:text-primary" @click="toggle(d)">{{ d.isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน' }}</button>
            <span class="flex gap-3">
              <button class="inline-flex items-center gap-1 text-primary hover:underline" @click="openEdit(d)">
                <Pencil class="h-3.5 w-3.5" :stroke-width="2" /> แก้ไข
              </button>
              <button class="inline-flex items-center gap-1 text-danger hover:underline" @click="remove(d)">
                <Trash2 class="h-3.5 w-3.5" :stroke-width="2" /> ลบ
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <form class="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl" @submit.prevent="save">
        <h2 class="mb-4 text-lg font-bold text-text">{{ editingId !== null ? 'แก้ไขส่วนลด' : 'เพิ่มส่วนลด' }}</h2>
        <div class="space-y-3">
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">ชื่อส่วนลด *</label>
            <input v-model="form.name" type="text" placeholder="เช่น สมาชิกลด 10%" :class="inputClass" />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition" :class="form.type === 'percent' ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted'" @click="form.type = 'percent'">เปอร์เซ็นต์ (%)</button>
            <button type="button" class="rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition" :class="form.type === 'amount' ? 'border-primary bg-primary-soft text-primary' : 'border-border text-text-muted'" @click="form.type = 'amount'">จำนวนเงิน (฿)</button>
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">{{ form.type === 'percent' ? 'ลดกี่เปอร์เซ็นต์ (1–100)' : 'ลดกี่บาท' }} *</label>
            <input v-model.number="form.value" type="number" min="0.01" :max="form.type === 'percent' ? 100 : undefined" step="0.01" :class="inputClass" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">เริ่มวันที่ (ไม่บังคับ)</label>
              <input v-model="startsDate" type="date" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">ถึงวันที่ (ไม่บังคับ)</label>
              <input v-model="endsDate" type="date" :class="inputClass" />
            </div>
          </div>
          <label class="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
            เปิดใช้งาน
            <input v-model="form.isActive" type="checkbox" class="h-4 w-4 accent-primary" />
          </label>
          <label class="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
            ใช้ได้เฉพาะผู้จัดการ/เจ้าของร้าน
            <input v-model="form.managerOnly" type="checkbox" class="h-4 w-4 accent-primary" />
          </label>
        </div>
        <div class="mt-5 flex gap-3">
          <button type="button" class="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted hover:bg-bg" @click="showModal = false">ยกเลิก</button>
          <button type="submit" class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50" :disabled="saving">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
        </div>
      </form>
    </div>
  </div>
</template>
