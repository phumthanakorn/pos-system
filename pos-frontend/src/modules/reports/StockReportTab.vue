<script setup lang="ts">
import { ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Boxes, AlertTriangle, XCircle, ArrowDownUp } from '@lucide/vue'
import { reportService, type StockReport } from '../../api/services/reportService'
import { errorMessage } from '../../store/modules/productStore'

const props = defineProps<{ from: string; to: string }>()
const report = ref<StockReport | null>(null)
const loading = ref(true)
const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function load() {
  loading.value = true
  try {
    report.value = (await reportService.stock(props.from, props.to)).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดรายงานสต็อกไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}
watch(() => [props.from, props.to], load, { immediate: true })
</script>

<template>
  <p v-if="loading && !report" class="text-text-muted">กำลังโหลด...</p>

  <template v-if="report">
    <p class="text-xs text-text-muted">คำนวณจากสินค้าที่เปิด "นับสต็อก" เท่านั้น ({{ report.trackedCount }} รายการ)</p>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" :class="{ 'opacity-60': loading }">
      <div class="rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 text-sm text-text-muted"><Boxes :size="16" /> มูลค่าสต็อกคงเหลือ</div>
        <div class="mt-2 text-2xl font-semibold text-text">฿{{ baht(report.stockValue) }}</div>
        <div v-if="report.costlessCount" class="text-xs text-warning">{{ report.costlessCount }} รายการยังไม่กรอกต้นทุน ไม่รวมในยอดนี้</div>
      </div>
      <div class="rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 text-sm text-text-muted"><AlertTriangle :size="16" /> ใกล้หมด</div>
        <div class="mt-2 text-2xl font-semibold text-warning">{{ report.lowStock.length }}</div>
      </div>
      <div class="rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 text-sm text-text-muted"><XCircle :size="16" /> หมดแล้ว</div>
        <div class="mt-2 text-2xl font-semibold text-danger">{{ report.outOfStock.length }}</div>
      </div>
      <div class="rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 text-sm text-text-muted"><ArrowDownUp :size="16" /> รับเข้า / ขายออก</div>
        <div class="mt-2 text-lg font-semibold text-text">+{{ report.movement.purchase }} / −{{ report.movement.sale }}</div>
        <div class="text-xs text-text-muted">ปรับยอด {{ report.movement.adjustment }} หน่วย</div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-2xl border border-border bg-surface p-5">
        <h2 class="mb-3 font-medium text-text">สินค้าใกล้หมด / หมดแล้ว</h2>
        <p v-if="!report.lowStock.length && !report.outOfStock.length" class="py-6 text-center text-sm text-text-muted">สต็อกทุกรายการปกติดี</p>
        <ul v-else class="divide-y divide-border text-sm">
          <li v-for="p in report.outOfStock" :key="'out-' + p.id" class="flex items-center justify-between py-2">
            <span class="text-text">{{ p.name }}</span>
            <span class="font-semibold text-danger">หมด</span>
          </li>
          <li v-for="p in report.lowStock" :key="'low-' + p.id" class="flex items-center justify-between py-2">
            <span class="text-text">{{ p.name }}</span>
            <span class="font-semibold text-warning">เหลือ {{ p.stockQty }}/{{ p.minStock }} {{ p.unit }}</span>
          </li>
        </ul>
      </section>

      <section class="rounded-2xl border border-border bg-surface p-5">
        <h2 class="mb-1 font-medium text-text">สินค้าเคลื่อนไหวสูงสุด 10 อันดับ</h2>
        <p class="mb-3 text-xs text-text-muted">นับรวมรับเข้า ขายออก และปรับยอด (หน่วยสัมบูรณ์)</p>
        <p v-if="!report.topMovers.length" class="py-6 text-center text-sm text-text-muted">ยังไม่มีความเคลื่อนไหวในช่วงนี้</p>
        <table v-else class="w-full text-sm">
          <thead class="text-left text-text-muted">
            <tr><th class="pb-2 font-normal">สินค้า</th><th class="pb-2 text-right font-normal">เคลื่อนไหว</th></tr>
          </thead>
          <tbody>
            <tr v-for="(m, i) in report.topMovers" :key="m.productId" class="border-t border-border">
              <td class="py-2 text-text">{{ i + 1 }}. {{ m.name }}</td>
              <td class="py-2 text-right text-ink-soft">{{ m.moved }} {{ m.unit }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </template>
</template>
