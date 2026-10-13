<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { Users, UserPlus, Gift, TrendingUp } from '@lucide/vue'
import { reportService, type MemberReport } from '../../api/services/reportService'
import { errorMessage } from '../../store/modules/productStore'

const props = defineProps<{ from: string; to: string }>()
const report = ref<MemberReport | null>(null)
const loading = ref(true)
const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function load() {
  loading.value = true
  try {
    report.value = (await reportService.members(props.from, props.to)).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดรายงานสมาชิกไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}
watch(() => [props.from, props.to], load, { immediate: true })

const salesSplit = computed(() => {
  if (!report.value) return []
  const { memberSales, nonMemberSales } = report.value
  const total = memberSales.total + nonMemberSales.total
  return [
    { label: 'สมาชิก', value: memberSales.total, bills: memberSales.billCount, pct: total ? (memberSales.total / total) * 100 : 0 },
    { label: 'ลูกค้าทั่วไป', value: nonMemberSales.total, bills: nonMemberSales.billCount, pct: total ? (nonMemberSales.total / total) * 100 : 0 },
  ]
})
</script>

<template>
  <p v-if="loading && !report" class="text-text-muted">กำลังโหลด...</p>

  <template v-if="report">
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" :class="{ 'opacity-60': loading }">
      <div class="rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 text-sm text-text-muted"><Users :size="16" /> สมาชิกทั้งหมด</div>
        <div class="mt-2 text-2xl font-semibold text-text">{{ report.totalMembers.toLocaleString('th-TH') }}</div>
      </div>
      <div class="rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 text-sm text-text-muted"><UserPlus :size="16" /> สมาชิกใหม่ในช่วงนี้</div>
        <div class="mt-2 text-2xl font-semibold text-text">{{ report.newMembers.toLocaleString('th-TH') }}</div>
      </div>
      <div class="rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 text-sm text-text-muted"><TrendingUp :size="16" /> สัดส่วนบิลจากสมาชิก</div>
        <div class="mt-2 text-2xl font-semibold text-text">{{ report.memberSharePercent.toFixed(0) }}%</div>
      </div>
      <div class="rounded-2xl border border-border bg-surface p-4">
        <div class="flex items-center gap-2 text-sm text-text-muted"><Gift :size="16" /> แต้มที่แจก / ใช้ไป</div>
        <div class="mt-2 text-lg font-semibold text-text">+{{ report.pointsIssued }} / −{{ report.pointsRedeemed }}</div>
        <div v-if="report.pointsReversed || report.pointsAdjusted" class="text-xs text-text-muted">คืนจากยกเลิกบิล {{ report.pointsReversed }} · ปรับด้วยมือ {{ report.pointsAdjusted >= 0 ? '+' : '' }}{{ report.pointsAdjusted }}</div>
      </div>
    </div>

    <div class="grid gap-6 lg:grid-cols-2">
      <section class="rounded-2xl border border-border bg-surface p-5">
        <h2 class="mb-4 font-medium text-text">ยอดขาย: สมาชิก vs ลูกค้าทั่วไป</h2>
        <div class="space-y-4">
          <div v-for="r in salesSplit" :key="r.label">
            <div class="mb-1 flex justify-between text-sm">
              <span class="text-ink-soft">{{ r.label }} <span class="text-text-muted">({{ r.bills }} บิล)</span></span>
              <span class="text-text">฿{{ baht(r.value) }} <span class="text-text-muted">({{ r.pct.toFixed(0) }}%)</span></span>
            </div>
            <div class="h-2 rounded-full bg-primary-soft"><div class="h-2 rounded-full bg-primary" :style="{ width: `${r.pct}%` }" /></div>
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-border bg-surface p-5">
        <h2 class="mb-1 font-medium text-text">ลูกค้ายอดซื้อสูงสุด 10 อันดับ</h2>
        <p class="mb-3 text-xs text-text-muted">เฉพาะบิลที่ผูกกับสมาชิกในช่วงนี้</p>
        <p v-if="!report.topCustomers.length" class="py-6 text-center text-sm text-text-muted">ยังไม่มีบิลจากสมาชิกในช่วงนี้</p>
        <table v-else class="w-full text-sm">
          <thead class="text-left text-text-muted">
            <tr><th class="pb-2 font-normal">ลูกค้า</th><th class="pb-2 text-right font-normal">บิล</th><th class="pb-2 text-right font-normal">ยอดซื้อ</th></tr>
          </thead>
          <tbody>
            <tr v-for="(c, i) in report.topCustomers" :key="c.customerId" class="border-t border-border">
              <td class="py-2 text-text">{{ i + 1 }}. {{ c.name }}</td>
              <td class="py-2 text-right text-ink-soft">{{ c.billCount }}</td>
              <td class="py-2 text-right text-text">฿{{ baht(c.total) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </template>
</template>
