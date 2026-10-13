<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { X } from '@lucide/vue'
import { shiftService, type ShiftDetail, type ShiftHistoryItem } from '../../api/services/shiftService'
import { errorMessage } from '../../store/modules/productStore'
import PaginationBar from '../../components/PaginationBar.vue'

const shifts = ref<ShiftHistoryItem[]>([])
const loading = ref(true)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const detail = ref<ShiftDetail | null>(null)
let requestId = 0

const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateText = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
const timeText = (iso: string) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })

// difference = counted cash - expected cash: negative means cash is missing from the drawer
function diffInfo(diff: number | null) {
  if (diff === null) return { label: '—', cls: 'text-text-muted', pill: '' }
  if (Math.abs(diff) < 0.005) return { label: 'ตรง', cls: 'text-success', pill: 'bg-success/10 text-success' }
  return diff > 0
    ? { label: `เกิน ฿${baht(diff)}`, cls: 'text-warning', pill: 'bg-warning/10 text-warning' }
    : { label: `ขาด ฿${baht(-diff)}`, cls: 'text-danger', pill: 'bg-danger/10 text-danger' }
}

async function load() {
  const mine = (requestId += 1)
  loading.value = true
  try {
    const { data } = await shiftService.history({ page: page.value, pageSize: pageSize.value })
    if (mine !== requestId) return
    shifts.value = data.data.items
    total.value = data.data.total
  } catch (error: unknown) {
    if (mine === requestId) toast.error(errorMessage(error, 'โหลดประวัติรอบขายไม่สำเร็จ'))
  } finally {
    if (mine === requestId) loading.value = false
  }
}
watch([page, pageSize], () => void load())
onMounted(load)

async function openDetail(id: number) {
  try {
    detail.value = (await shiftService.detail(id)).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดรายละเอียดกะไม่สำเร็จ'))
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="border-b border-border bg-surface px-6 py-3">
      <h1 class="text-base font-bold text-text">ประวัติรอบขาย</h1>
    </header>

    <div class="flex flex-1 gap-4 overflow-hidden p-6">
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div class="flex-1 overflow-y-auto" :class="loading ? 'opacity-60' : ''">
          <table class="w-full text-left text-sm">
            <thead class="sticky top-0 border-b border-border bg-bg/90 text-xs text-text-muted">
              <tr>
                <th class="px-5 py-3.5 font-medium">กะ</th>
                <th class="px-5 py-3.5 font-medium">ผู้เปิดกะ</th>
                <th class="px-5 py-3.5 text-right font-medium">ยอดขาย</th>
                <th class="px-5 py-3.5 text-right font-medium">เงินสดที่ควรมี</th>
                <th class="px-5 py-3.5 text-right font-medium">เงินสดที่นับได้</th>
                <th class="px-5 py-3.5 font-medium">ผลต่าง</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="s in shifts" :key="s.id" class="cursor-pointer transition hover:bg-bg/60" :class="detail?.id === s.id ? 'bg-primary-soft/40' : ''" @click="openDetail(s.id)">
                <td class="whitespace-nowrap px-5 py-4">
                  <p class="font-semibold text-text">{{ dateText(s.openedAt) }}</p>
                  <p class="mt-0.5 text-xs text-text-muted">{{ timeText(s.openedAt) }} – {{ s.closedAt ? timeText(s.closedAt) : '' }} น.</p>
                </td>
                <td class="px-5 py-4 text-text">{{ s.cashierName }}</td>
                <td class="whitespace-nowrap px-5 py-4 text-right">
                  <p class="font-semibold text-text">฿{{ baht(s.sales.total) }}</p>
                  <p class="mt-0.5 text-xs text-text-muted">{{ s.sales.count }} บิล</p>
                </td>
                <td class="whitespace-nowrap px-5 py-4 text-right text-ink-soft">฿{{ baht(s.expectedCash) }}</td>
                <td class="whitespace-nowrap px-5 py-4 text-right text-ink-soft">฿{{ baht(s.closingCash) }}</td>
                <td class="whitespace-nowrap px-5 py-4">
                  <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="diffInfo(s.difference).pill">{{ diffInfo(s.difference).label }}</span>
                </td>
              </tr>
              <tr v-if="!loading && !shifts.length">
                <td colspan="6" class="py-14 text-center text-text-muted">ยังไม่มีกะที่ปิดแล้ว</td>
              </tr>
            </tbody>
          </table>
        </div>
        <PaginationBar v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>

      <aside v-if="detail" class="w-80 shrink-0 overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div class="mb-4 flex items-start justify-between">
          <div>
            <p class="text-base font-bold text-text">กะ #{{ detail.id }}</p>
            <p class="text-sm text-text-muted">{{ detail.cashierName }}</p>
            <p class="mt-0.5 text-xs text-text-muted">
              {{ dateText(detail.openedAt) }} {{ timeText(detail.openedAt) }}<template v-if="detail.closedAt"> – {{ timeText(detail.closedAt) }}</template> น.
            </p>
          </div>
          <button class="text-text-muted hover:text-text" @click="detail = null"><X :size="18" /></button>
        </div>

        <div class="mb-4 rounded-xl p-3 text-center" :class="diffInfo(detail.difference).pill || 'bg-bg'">
          <p class="text-xs text-text-muted">ผลต่างเงินสด</p>
          <p class="text-xl font-bold">{{ diffInfo(detail.difference).label }}</p>
        </div>

        <p class="mb-1 text-xs font-semibold text-text-muted">ยอดขาย ({{ detail.sales.count }} บิล)</p>
        <dl class="mb-4 space-y-1 text-sm">
          <div class="flex justify-between"><dt class="text-text-muted">เงินสด</dt><dd>฿{{ baht(detail.sales.cash) }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">บัตร</dt><dd>฿{{ baht(detail.sales.card) }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">QR / พร้อมเพย์</dt><dd>฿{{ baht(detail.sales.qr) }}</dd></div>
          <div class="flex justify-between border-t border-border pt-1 font-semibold"><dt>รวม</dt><dd>฿{{ baht(detail.sales.total) }}</dd></div>
        </dl>

        <p class="mb-1 text-xs font-semibold text-text-muted">เงินสดในลิ้นชัก</p>
        <dl class="mb-4 space-y-1 text-sm">
          <div class="flex justify-between"><dt class="text-text-muted">เงินทอนตั้งต้น</dt><dd>฿{{ baht(detail.openingCash) }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">+ ขายเงินสด</dt><dd>฿{{ baht(detail.sales.cash) }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">+ นำเงินเข้า</dt><dd>฿{{ baht(detail.cashIn) }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">− นำเงินออก</dt><dd>฿{{ baht(detail.cashOut) }}</dd></div>
          <div class="flex justify-between border-t border-border pt-1"><dt class="text-text-muted">เงินสดที่ควรมี</dt><dd class="font-semibold">฿{{ baht(detail.expectedCash) }}</dd></div>
          <div class="flex justify-between"><dt class="text-text-muted">นับได้จริง</dt><dd class="font-semibold">฿{{ baht(detail.closingCash ?? 0) }}</dd></div>
        </dl>

        <p class="mb-1 text-xs font-semibold text-text-muted">รายการนำเงินเข้า/ออก</p>
        <ul class="divide-y divide-border text-sm">
          <li v-for="m in detail.movements" :key="m.id" class="py-2">
            <div class="flex justify-between">
              <span class="text-text">{{ m.reason }}</span>
              <span class="font-semibold" :class="m.type === 'in' ? 'text-success' : 'text-danger'">{{ m.type === 'in' ? '+' : '−' }}฿{{ baht(m.amount) }}</span>
            </div>
            <p class="text-xs text-text-muted">{{ timeText(m.createdAt) }} น.</p>
          </li>
          <li v-if="!detail.movements.length" class="py-3 text-text-muted">ไม่มีรายการ</li>
        </ul>
      </aside>
    </div>
  </div>
</template>
