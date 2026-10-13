<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { ArrowDownToLine, ArrowUpFromLine, Banknote, Lock, LockOpen, Wallet, Receipt, RefreshCw, Check } from '@lucide/vue'
import { errorMessage } from '../../store/modules/productStore'
import { useShiftStore } from '../../store/modules/shiftStore'
import type { CloseShiftResult } from '../../api/services/shiftService'

const shiftStore = useShiftStore()
const loading = ref(true)
const busy = ref(false)

const shift = computed(() => shiftStore.shift)
const baht = (n: number) => `฿${n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const time = (iso: string) => new Date(iso).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

async function load() {
  loading.value = true
  try {
    await shiftStore.load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดข้อมูลกะไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}
onMounted(load)

/* ---- open ---- */
const openingCash = ref<number | null>(null)
const quickAmounts = [500, 1000, 2000, 3000]

async function openShift() {
  if (openingCash.value === null || openingCash.value < 0) {
    toast.error('กรุณาใส่เงินทอนเริ่มต้น (ใส่ 0 ได้ถ้าไม่มี)')
    return
  }
  busy.value = true
  try {
    await shiftStore.open(openingCash.value)
    openingCash.value = null
    lastClose.value = null
    toast.success('เปิดกะแล้ว พร้อมขาย')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'เปิดกะไม่สำเร็จ'))
  } finally {
    busy.value = false
  }
}

/* ---- cash in / out ---- */
const movementType = ref<'in' | 'out' | null>(null)
const movementAmount = ref<number | null>(null)
const movementReason = ref('')

function openMovement(type: 'in' | 'out') {
  movementType.value = type
  movementAmount.value = null
  movementReason.value = ''
}

async function saveMovement() {
  if (!movementType.value) return
  if (!movementAmount.value || movementAmount.value <= 0) {
    toast.error('กรุณาใส่จำนวนเงิน')
    return
  }
  if (movementReason.value.trim().length < 3) {
    toast.error('กรุณาระบุเหตุผลอย่างน้อย 3 ตัวอักษร')
    return
  }
  busy.value = true
  try {
    await shiftStore.addCashMovement(movementType.value, movementAmount.value, movementReason.value.trim())
    movementType.value = null
    toast.success('บันทึกแล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'บันทึกไม่สำเร็จ'))
  } finally {
    busy.value = false
  }
}

/* ---- close ---- */
const showClose = ref(false)
const countedCash = ref<number | null>(null)
const lastClose = ref<CloseShiftResult | null>(null)
const difference = computed(() =>
  countedCash.value === null || !shift.value ? null : Math.round((countedCash.value - shift.value.expectedCash) * 100) / 100,
)

function openClose() {
  countedCash.value = null
  showClose.value = true
}

async function closeShift() {
  if (countedCash.value === null || countedCash.value < 0) {
    toast.error('กรุณานับเงินสดในลิ้นชักแล้วใส่จำนวน')
    return
  }
  busy.value = true
  try {
    lastClose.value = await shiftStore.close(countedCash.value)
    showClose.value = false
    toast.success('ปิดกะแล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ปิดกะไม่สำเร็จ'))
  } finally {
    busy.value = false
  }
}

const inputClass = 'w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary'
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div class="flex items-center gap-3">
        <h1 class="text-base font-bold text-text">รอบการขาย</h1>
        <span v-if="shift" class="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
          <LockOpen class="h-3.5 w-3.5" :stroke-width="2" /> เปิดอยู่
        </span>
        <span v-else-if="!loading" class="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1 text-xs font-semibold text-text-muted">
          <Lock class="h-3.5 w-3.5" :stroke-width="2" /> ยังไม่เปิดกะ
        </span>
      </div>
      <button class="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted hover:bg-bg hover:text-primary" title="รีเฟรช" @click="load">
        <RefreshCw class="h-4 w-4" :class="loading ? 'animate-spin' : ''" :stroke-width="2" />
      </button>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <p v-if="loading && !shift" class="text-sm text-text-muted">กำลังโหลด...</p>

      <!-- ยังไม่เปิดกะ -->
      <div v-else-if="!shift" class="mx-auto max-w-md">
        <div class="rounded-3xl bg-surface p-8 text-center shadow-sm">
          <span class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Wallet class="h-8 w-8" :stroke-width="1.75" />
          </span>
          <h2 class="text-xl font-bold text-text">เปิดกะเพื่อเริ่มขาย</h2>
          <p class="mt-1 text-sm text-text-muted">นับเงินทอนที่ใส่ในลิ้นชักตอนเริ่มกะ แล้วใส่จำนวนด้านล่าง</p>

          <label class="mt-6 block text-left text-xs font-semibold text-text-muted">เงินทอนเริ่มต้น (บาท)</label>
          <input
            v-model.number="openingCash"
            type="number"
            min="0"
            placeholder="0.00"
            class="mt-1 w-full rounded-2xl border border-border px-4 py-3 text-center text-2xl font-bold outline-none focus:border-primary"
            @keyup.enter="openShift"
          />
          <div class="mt-3 grid grid-cols-4 gap-2">
            <button
              v-for="amt in quickAmounts"
              :key="amt"
              class="rounded-xl border border-border py-2 text-sm font-semibold text-text-muted transition hover:border-primary hover:text-primary"
              @click="openingCash = amt"
            >
              {{ amt.toLocaleString('th-TH') }}
            </button>
          </div>
          <button
            class="mt-6 w-full rounded-2xl bg-primary py-3.5 text-base font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
            :disabled="busy"
            @click="openShift"
          >
            {{ busy ? 'กำลังเปิดกะ...' : 'เปิดกะ' }}
          </button>
        </div>

        <div v-if="lastClose" class="mt-6 rounded-3xl bg-surface p-6 shadow-sm">
          <h2 class="mb-3 text-base font-bold text-text">สรุปกะที่ปิดล่าสุด</h2>
          <dl class="space-y-2 text-sm">
            <div class="flex justify-between"><dt class="text-text-muted">เงินทอนเริ่มต้น</dt><dd>{{ baht(lastClose.openingCash) }}</dd></div>
            <div class="flex justify-between"><dt class="text-text-muted">ยอดขายเงินสด</dt><dd>{{ baht(lastClose.cashSales) }}</dd></div>
            <div class="flex justify-between"><dt class="text-text-muted">นำเงินเข้า / ออก</dt><dd>+{{ baht(lastClose.cashIn) }} / −{{ baht(lastClose.cashOut) }}</dd></div>
            <div class="flex justify-between"><dt class="text-text-muted">เงินสดที่ควรมี</dt><dd>{{ baht(lastClose.expectedCash) }}</dd></div>
            <div class="flex justify-between"><dt class="text-text-muted">นับได้จริง</dt><dd>{{ baht(lastClose.closingCash) }}</dd></div>
            <div class="flex justify-between border-t border-border pt-2 font-bold">
              <dt>ส่วนต่าง</dt>
              <dd :class="lastClose.difference === 0 ? 'text-success' : 'text-danger'">
                {{ lastClose.difference > 0 ? '+' : '' }}{{ baht(lastClose.difference) }}
                <span class="text-xs font-semibold">{{ lastClose.difference === 0 ? '(ตรง)' : lastClose.difference > 0 ? '(เกิน)' : '(ขาด)' }}</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- เปิดกะอยู่ -->
      <div v-else class="mx-auto max-w-5xl space-y-6">
        <p class="text-sm text-text-muted">เปิดโดย {{ shift.cashierName }} · {{ time(shift.openedAt) }}</p>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-3xl bg-surface p-5 shadow-sm">
            <p class="flex items-center gap-2 text-sm text-text-muted"><Wallet class="h-4 w-4" :stroke-width="1.75" /> เงินทอนเริ่มต้น</p>
            <p class="mt-2 text-3xl font-extrabold text-text">{{ baht(shift.openingCash) }}</p>
          </div>
          <div class="rounded-3xl border-2 border-primary/30 bg-primary-soft p-5">
            <p class="flex items-center gap-2 text-sm text-primary"><Banknote class="h-4 w-4" :stroke-width="1.75" /> เงินสดที่ควรมีในลิ้นชัก</p>
            <p class="mt-2 text-3xl font-extrabold text-text">{{ baht(shift.expectedCash) }}</p>
            <p class="mt-1 text-xs text-text-muted">เงินเริ่มต้น + ขายเงินสด + เงินเข้า − เงินออก</p>
          </div>
          <div class="rounded-3xl bg-surface p-5 shadow-sm">
            <p class="flex items-center gap-2 text-sm text-text-muted"><Receipt class="h-4 w-4" :stroke-width="1.75" /> ยอดขายรวมกะนี้</p>
            <p class="mt-2 text-3xl font-extrabold text-text">{{ baht(shift.sales.total) }}</p>
            <p class="mt-1 text-xs text-text-muted">
              {{ shift.sales.count }} บิล · สด {{ baht(shift.sales.cash) }} · บัตร {{ baht(shift.sales.card) }} · QR {{ baht(shift.sales.qr) }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 rounded-3xl bg-surface p-4 shadow-sm">
          <button class="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary-hover" @click="openMovement('in')">
            <ArrowDownToLine class="h-4 w-4" :stroke-width="2" /> นำเงินเข้า
          </button>
          <button class="flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-bold text-text transition hover:bg-bg" @click="openMovement('out')">
            <ArrowUpFromLine class="h-4 w-4" :stroke-width="2" /> นำเงินออก
          </button>
          <button class="ml-auto flex items-center gap-2 rounded-xl bg-danger px-5 py-3 text-sm font-bold text-white transition hover:bg-danger-hover" @click="openClose">
            <Lock class="h-4 w-4" :stroke-width="2" /> ปิดกะ
          </button>
        </div>

        <section>
          <h2 class="text-base font-bold text-text">รายการเงินสดของกะ</h2>
          <p class="mb-3 text-xs text-text-muted">เฉพาะเงินที่นำเข้า/ออกจากลิ้นชัก (ยอดขายดูได้ที่ประวัติใบเสร็จ)</p>
          <div class="overflow-hidden rounded-2xl border border-border bg-surface">
            <table class="w-full text-left text-sm">
              <thead class="bg-bg text-xs font-semibold uppercase tracking-wide text-text-muted">
                <tr><th class="px-4 py-3">เวลา</th><th class="px-4 py-3">รายการ</th><th class="px-4 py-3">เหตุผล</th><th class="px-4 py-3 text-right">จำนวน</th></tr>
              </thead>
              <tbody class="divide-y divide-border">
                <tr v-for="m in shift.movements" :key="m.id">
                  <td class="px-4 py-3 text-text-muted">{{ time(m.createdAt) }}</td>
                  <td class="px-4 py-3">
                    <span class="rounded-full px-2.5 py-1 text-xs font-semibold" :class="m.type === 'in' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'">
                      {{ m.type === 'in' ? 'เงินเข้า' : 'เงินออก' }}
                    </span>
                  </td>
                  <td class="px-4 py-3">{{ m.reason }}</td>
                  <td class="px-4 py-3 text-right font-semibold" :class="m.type === 'in' ? 'text-success' : 'text-danger'">
                    {{ m.type === 'in' ? '+' : '−' }}{{ baht(m.amount) }}
                  </td>
                </tr>
                <tr>
                  <td class="px-4 py-3 text-text-muted">{{ time(shift.openedAt) }}</td>
                  <td class="px-4 py-3"><span class="rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">เงินเปิดกะ</span></td>
                  <td class="px-4 py-3 text-text-muted">—</td>
                  <td class="px-4 py-3 text-right font-semibold text-text">+{{ baht(shift.openingCash) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>

    <!-- นำเงินเข้า/ออก -->
    <div v-if="movementType" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <form class="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl" @submit.prevent="saveMovement">
        <h2 class="mb-4 text-lg font-bold text-text">{{ movementType === 'in' ? 'นำเงินเข้าลิ้นชัก' : 'นำเงินออกจากลิ้นชัก' }}</h2>
        <label class="mb-1 block text-xs font-semibold text-text-muted">จำนวนเงิน (บาท)</label>
        <input v-model.number="movementAmount" type="number" min="0.01" step="0.01" :class="inputClass" />
        <label class="mb-1 mt-3 block text-xs font-semibold text-text-muted">เหตุผล</label>
        <input v-model="movementReason" type="text" :placeholder="movementType === 'in' ? 'เช่น เติมเงินทอน' : 'เช่น จ่ายค่าน้ำแข็ง'" :class="inputClass" />
        <div class="mt-5 flex gap-3">
          <button type="button" class="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted hover:bg-bg" @click="movementType = null">ยกเลิก</button>
          <button type="submit" class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50" :disabled="busy">บันทึก</button>
        </div>
      </form>
    </div>

    <!-- ปิดกะ -->
    <div v-if="showClose && shift" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <form class="w-full max-w-sm rounded-3xl bg-surface p-6 shadow-xl" @submit.prevent="closeShift">
        <h2 class="text-lg font-bold text-text">ปิดกะ</h2>
        <p class="mt-1 text-sm text-text-muted">นับเงินสดทั้งหมดในลิ้นชัก แล้วใส่จำนวนที่นับได้</p>
        <div class="mt-4 rounded-2xl bg-bg p-4 text-center">
          <p class="text-xs text-text-muted">เงินสดที่ควรมี</p>
          <p class="text-2xl font-extrabold text-text">{{ baht(shift.expectedCash) }}</p>
        </div>
        <label class="mb-1 mt-4 block text-xs font-semibold text-text-muted">นับได้จริง (บาท)</label>
        <input v-model.number="countedCash" type="number" min="0" step="0.01" placeholder="0.00" class="w-full rounded-2xl border border-border px-4 py-3 text-center text-2xl font-bold outline-none focus:border-primary" />
        <p v-if="difference !== null" class="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold" :class="difference === 0 ? 'text-success' : 'text-danger'">
          <Check v-if="difference === 0" class="h-4 w-4" :stroke-width="2.5" />
          {{ difference === 0 ? 'เงินสดตรง' : difference > 0 ? `เกิน ${baht(difference)}` : `ขาด ${baht(Math.abs(difference))}` }}
        </p>
        <div class="mt-5 flex gap-3">
          <button type="button" class="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted hover:bg-bg" @click="showClose = false">ยกเลิก</button>
          <button type="submit" class="flex-1 rounded-xl bg-danger py-2.5 text-sm font-bold text-white hover:bg-danger-hover disabled:opacity-50" :disabled="busy">ยืนยันปิดกะ</button>
        </div>
      </form>
    </div>
  </div>
</template>
