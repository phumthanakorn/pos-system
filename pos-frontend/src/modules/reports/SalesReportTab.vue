<script setup lang="ts">
import { computed, watch, ref } from 'vue'
import { toast } from 'vue-sonner'
import { Receipt, Wallet, Percent, Ban } from '@lucide/vue'
import { reportService, type SalesReport } from '../../api/services/reportService'
import { errorMessage } from '../../store/modules/productStore'

const props = defineProps<{ from: string; to: string }>()

const report = ref<SalesReport | null>(null)
const loading = ref(true)
const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function load() {
  loading.value = true
  try {
    report.value = (await reportService.sales(props.from, props.to)).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดรายงานไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}
watch(() => [props.from, props.to], load, { immediate: true })
defineExpose({ reload: load })

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
</script>

<template>
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
</template>
