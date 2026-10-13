<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Receipt, Wallet, Percent, Ban } from '@lucide/vue'
import { reportService, type SalesReport } from '../../api/services/reportService'
import { errorMessage } from '../../store/modules/productStore'

type Preset = 'today' | '7d' | '30d' | 'month' | 'custom'

// Bangkok calendar date (UTC+7, no DST), same rule the server uses
const bangkokToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
const shiftDay = (day: string, delta: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

const presets: { key: Preset; label: string }[] = [
  { key: 'today', label: 'วันนี้' },
  { key: '7d', label: '7 วันล่าสุด' },
  { key: '30d', label: '30 วันล่าสุด' },
  { key: 'month', label: 'เดือนนี้' },
  { key: 'custom', label: 'กำหนดเอง' },
]

const preset = ref<Preset>('7d')
const from = ref(shiftDay(bangkokToday(), -6))
const to = ref(bangkokToday())
const report = ref<SalesReport | null>(null)
const loading = ref(true)

const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function load() {
  loading.value = true
  try {
    report.value = (await reportService.sales(from.value, to.value)).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดรายงานไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}

function choose(key: Preset) {
  preset.value = key
  const today = bangkokToday()
  if (key === 'today') from.value = to.value = today
  else if (key === '7d') [from.value, to.value] = [shiftDay(today, -6), today]
  else if (key === '30d') [from.value, to.value] = [shiftDay(today, -29), today]
  else if (key === 'month') [from.value, to.value] = [`${today.slice(0, 8)}01`, today]
  else return
  load()
}

const maxDaily = computed(() => Math.max(1, ...(report.value?.daily.map((d) => d.total) ?? [0])))
const methodRows = computed(() => {
  const m = report.value?.byMethod
  const total = m ? m.cash + m.card + m.qr : 0
  return [
    { label: 'เงินสด', value: m?.cash ?? 0 },
    { label: 'บัตร', value: m?.card ?? 0 },
    { label: 'QR / โอน', value: m?.qr ?? 0 },
  ].map((r) => ({ ...r, pct: total ? (r.value / total) * 100 : 0 }))
})
const dayLabel = (d: string) => `${d.slice(8)}/${d.slice(5, 7)}`

onMounted(load)
</script>

<template>
  <div class="h-full overflow-y-auto"><div class="mx-auto max-w-6xl space-y-6 p-6">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="text-xl font-semibold text-text">รายงานยอดขาย</h1>
        <p class="text-sm text-text-muted">นับเฉพาะบิลที่ชำระแล้ว ตามเวลาประเทศไทย</p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          v-for="p in presets"
          :key="p.key"
          class="rounded-xl border px-3 py-2 text-sm"
          :class="preset === p.key ? 'border-primary bg-primary-soft text-primary' : 'border-border bg-surface text-ink-soft hover:border-primary'"
          @click="choose(p.key)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <div v-if="preset === 'custom'" class="flex flex-wrap items-center gap-2 text-sm">
      <input v-model="from" type="date" :max="to" class="rounded-xl border border-border px-3 py-2 outline-none focus:border-primary" />
      <span class="text-text-muted">ถึง</span>
      <input v-model="to" type="date" :min="from" class="rounded-xl border border-border px-3 py-2 outline-none focus:border-primary" />
      <button class="rounded-xl bg-primary px-4 py-2 text-white hover:bg-primary-hover" @click="load">ดูรายงาน</button>
    </div>

    <p v-if="loading && !report" class="text-text-muted">กำลังโหลด...</p>

    <template v-if="report">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" :class="{ 'opacity-60': loading }">
        <div class="rounded-2xl border border-border bg-surface p-4">
          <div class="flex items-center gap-2 text-sm text-text-muted"><Wallet :size="16" /> ยอดขายสุทธิ</div>
          <div class="mt-2 text-2xl font-semibold text-text">฿{{ baht(report.totals.netSales) }}</div>
        </div>
        <div class="rounded-2xl border border-border bg-surface p-4">
          <div class="flex items-center gap-2 text-sm text-text-muted"><Receipt :size="16" /> จำนวนบิล</div>
          <div class="mt-2 text-2xl font-semibold text-text">{{ report.totals.billCount.toLocaleString('th-TH') }}</div>
          <div class="text-xs text-text-muted">เฉลี่ย ฿{{ baht(report.totals.averageBill) }} / บิล</div>
        </div>
        <div class="rounded-2xl border border-border bg-surface p-4">
          <div class="flex items-center gap-2 text-sm text-text-muted"><Percent :size="16" /> ส่วนลดรวม</div>
          <div class="mt-2 text-2xl font-semibold text-text">฿{{ baht(report.totals.discount) }}</div>
          <div class="text-xs text-text-muted">ภาษี ฿{{ baht(report.totals.tax) }}</div>
        </div>
        <div class="rounded-2xl border border-border bg-surface p-4">
          <div class="flex items-center gap-2 text-sm text-text-muted"><Ban :size="16" /> บิลที่ยกเลิก</div>
          <div class="mt-2 text-2xl font-semibold text-text">{{ report.totals.cancelledCount }}</div>
          <div class="text-xs text-text-muted">มูลค่า ฿{{ baht(report.totals.cancelledAmount) }}</div>
        </div>
      </div>

      <section class="rounded-2xl border border-border bg-surface p-5">
        <h2 class="mb-4 font-medium text-text">ยอดขายรายวัน</h2>
        <div class="flex h-48 items-end gap-1 overflow-x-auto">
          <div v-for="d in report.daily" :key="d.day" class="flex h-full min-w-6 flex-1 flex-col items-center justify-end gap-1" :title="`${d.day}: ฿${baht(d.total)} (${d.count} บิล)`">
            <div class="w-full rounded-t-md bg-primary" :style="{ height: `${(d.total / maxDaily) * 100}%`, minHeight: d.total ? '2px' : '0' }" />
            <span v-if="report.daily.length <= 14" class="text-[10px] text-text-muted">{{ dayLabel(d.day) }}</span>
          </div>
        </div>
      </section>

      <div class="grid gap-6 lg:grid-cols-2">
        <section class="rounded-2xl border border-border bg-surface p-5">
          <h2 class="mb-4 font-medium text-text">ช่องทางชำระเงิน</h2>
          <div class="space-y-4">
            <div v-for="r in methodRows" :key="r.label">
              <div class="mb-1 flex justify-between text-sm">
                <span class="text-ink-soft">{{ r.label }}</span>
                <span class="text-text">฿{{ baht(r.value) }} <span class="text-text-muted">({{ r.pct.toFixed(0) }}%)</span></span>
              </div>
              <div class="h-2 rounded-full bg-primary-soft"><div class="h-2 rounded-full bg-primary" :style="{ width: `${r.pct}%` }" /></div>
            </div>
          </div>
        </section>

        <section class="rounded-2xl border border-border bg-surface p-5">
          <h2 class="mb-1 font-medium text-text">สินค้าขายดี 10 อันดับ</h2>
          <p class="mb-3 text-xs text-text-muted">ยอดก่อนหักส่วนลดทั้งบิล</p>
          <p v-if="!report.topProducts.length" class="py-6 text-center text-sm text-text-muted">ยังไม่มีการขายในช่วงนี้</p>
          <table v-else class="w-full text-sm">
            <thead class="text-left text-text-muted">
              <tr><th class="pb-2 font-normal">สินค้า</th><th class="pb-2 text-right font-normal">จำนวน</th><th class="pb-2 text-right font-normal">ยอดขาย</th></tr>
            </thead>
            <tbody>
              <tr v-for="(t, i) in report.topProducts" :key="t.productId" class="border-t border-border">
                <td class="py-2 text-text">{{ i + 1 }}. {{ t.name }}</td>
                <td class="py-2 text-right text-ink-soft">{{ t.qty.toLocaleString('th-TH') }}</td>
                <td class="py-2 text-right text-text">฿{{ baht(t.revenue) }}</td>
              </tr>
            </tbody>
          </table>
        </section>
      </div>
    </template>
  </div>
  </div>
</template>
