<script setup lang="ts">
import { ref } from 'vue'
import { BarChart3, Boxes, Users } from '@lucide/vue'
import SalesReportTab from './SalesReportTab.vue'
import StockReportTab from './StockReportTab.vue'
import MemberReportTab from './MemberReportTab.vue'

type Preset = 'today' | '7d' | '30d' | 'month' | 'custom'
type Tab = 'sales' | 'stock' | 'members'

// Bangkok calendar date (UTC+7, no DST), same rule the server uses
const bangkokToday = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10)
const shiftDay = (day: string, delta: number) => {
  const d = new Date(`${day}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

const tabs: { key: Tab; label: string; icon: unknown }[] = [
  { key: 'sales', label: 'ยอดขาย', icon: BarChart3 },
  { key: 'stock', label: 'สต็อก', icon: Boxes },
  { key: 'members', label: 'สมาชิก', icon: Users },
]
const tab = ref<Tab>('sales')

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

function choose(key: Preset) {
  preset.value = key
  const today = bangkokToday()
  if (key === 'today') from.value = to.value = today
  else if (key === '7d') [from.value, to.value] = [shiftDay(today, -6), today]
  else if (key === '30d') [from.value, to.value] = [shiftDay(today, -29), today]
  else if (key === 'month') [from.value, to.value] = [`${today.slice(0, 8)}01`, today]
  // 'custom' leaves from/to as-is; the date inputs themselves drive the change
}

const titles: Record<Tab, { title: string; subtitle: string }> = {
  sales: { title: 'รายงานยอดขาย', subtitle: 'นับเฉพาะบิลที่ชำระแล้ว ตามเวลาประเทศไทย' },
  stock: { title: 'รายงานสต็อก', subtitle: 'มูลค่าคงเหลือ สินค้าใกล้หมด และความเคลื่อนไหวของสต็อก' },
  members: { title: 'รายงานสมาชิก', subtitle: 'ยอดขายจากสมาชิก แต้มที่แจก/ใช้ และลูกค้ายอดซื้อสูงสุด' },
}
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="mx-auto max-w-6xl space-y-6 p-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-text">{{ titles[tab].title }}</h1>
          <p class="text-sm text-text-muted">{{ titles[tab].subtitle }}</p>
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
      </div>

      <div class="flex gap-1 rounded-full bg-bg p-1 text-sm font-medium w-fit">
        <button
          v-for="t in tabs"
          :key="t.key"
          class="flex items-center gap-1.5 rounded-full px-4 py-1.5 transition"
          :class="tab === t.key ? 'bg-ink text-white' : 'text-text-muted hover:text-text'"
          @click="tab = t.key"
        >
          <component :is="t.icon" :size="15" /> {{ t.label }}
        </button>
      </div>

      <div class="space-y-6">
        <SalesReportTab v-if="tab === 'sales'" :from="from" :to="to" />
        <StockReportTab v-else-if="tab === 'stock'" :from="from" :to="to" />
        <MemberReportTab v-else :from="from" :to="to" />
      </div>
    </div>
  </div>
</template>
