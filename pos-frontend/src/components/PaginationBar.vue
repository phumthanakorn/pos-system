<script setup lang="ts">
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'

const props = defineProps<{ page: number; pageSize: number; total: number }>()
const emit = defineEmits<{ 'update:page': [page: number]; 'update:pageSize': [size: number] }>()

const totalPages = computed(() => Math.max(Math.ceil(props.total / props.pageSize), 1))
const from = computed(() => (props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1))
const to = computed(() => Math.min(props.page * props.pageSize, props.total))

// 1 … 4 5 [6] 7 8 … 20 — always keeps first/last and a window around the current page
const pages = computed<(number | '…')[]>(() => {
  const last = totalPages.value
  const current = props.page
  const set = new Set([1, last, current - 1, current, current + 1])
  const sorted = [...set].filter((n) => n >= 1 && n <= last).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((n, i) => {
    const prev = sorted[i - 1]
    if (prev !== undefined && n - prev > 1) out.push('…')
    out.push(n)
  })
  return out
})

function go(page: number) {
  if (page >= 1 && page <= totalPages.value && page !== props.page) emit('update:page', page)
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
    <p class="text-text-muted">
      <template v-if="total">แสดง {{ from }}–{{ to }} จาก {{ total.toLocaleString('th-TH') }} รายการ</template>
      <template v-else>ไม่พบรายการ</template>
    </p>

    <div class="flex items-center gap-3">
      <label class="flex items-center gap-1.5 text-xs text-text-muted">
        แถวต่อหน้า
        <select
          :value="pageSize"
          class="rounded-lg border border-border bg-surface px-2 py-1 text-xs outline-none focus:border-primary"
          @change="emit('update:pageSize', Number(($event.target as HTMLSelectElement).value))"
        >
          <option v-for="n in [10, 20, 50, 100]" :key="n" :value="n">{{ n }}</option>
        </select>
      </label>

      <nav class="flex items-center gap-1" aria-label="เปลี่ยนหน้า">
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition hover:bg-bg disabled:opacity-40"
          :disabled="page <= 1"
          aria-label="หน้าก่อนหน้า"
          @click="go(page - 1)"
        >
          <ChevronLeft class="h-4 w-4" :stroke-width="2" />
        </button>
        <template v-for="(item, i) in pages" :key="i">
          <span v-if="item === '…'" class="px-1 text-text-muted">…</span>
          <button
            v-else
            class="h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition"
            :class="item === page ? 'bg-primary text-white' : 'border border-border text-text hover:bg-bg'"
            :aria-current="item === page ? 'page' : undefined"
            @click="go(item)"
          >
            {{ item }}
          </button>
        </template>
        <button
          class="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-muted transition hover:bg-bg disabled:opacity-40"
          :disabled="page >= totalPages"
          aria-label="หน้าถัดไป"
          @click="go(page + 1)"
        >
          <ChevronRight class="h-4 w-4" :stroke-width="2" />
        </button>
      </nav>
    </div>
  </div>
</template>
