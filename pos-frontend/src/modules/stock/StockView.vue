<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { AlertTriangle, History, Package, PackagePlus, Search, X } from '@lucide/vue'
import { productService, type StockMovement } from '../../api/services/productService'
import { useProductStore, errorMessage, type Product } from '../../store/modules/productStore'
import PaginationBar from '../../components/PaginationBar.vue'

const productStore = useProductStore()
const loading = ref(true)
const search = ref('')
const showLowOnly = ref(false)

async function load() {
  loading.value = true
  try {
    await productStore.load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดสินค้าไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
}
onMounted(load)

const trackedProducts = computed(() => productStore.products.filter((p) => p.trackStock))
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return trackedProducts.value.filter((p) => {
    if (showLowOnly.value && !(p.minStock > 0 && p.stockQty <= p.minStock)) return false
    if (!q) return true
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  })
})
const lowStockCount = computed(() => trackedProducts.value.filter((p) => p.minStock > 0 && p.stockQty <= p.minStock).length)

function stockCls(p: Product) {
  if (p.stockQty <= 0) return 'text-danger'
  if (p.minStock > 0 && p.stockQty <= p.minStock) return 'text-warning'
  return 'text-text'
}

// ---- adjust modal
const showAdjust = ref(false)
const adjusting = ref<Product | null>(null)
const adjustForm = reactive({ mode: 'in' as 'in' | 'out', qty: 0, type: 'purchase' as 'purchase' | 'adjustment', note: '' })
const saving = ref(false)

function openAdjust(p: Product) {
  adjusting.value = p
  Object.assign(adjustForm, { mode: 'in', qty: 0, type: 'purchase', note: '' })
  showAdjust.value = true
}
async function submitAdjust() {
  if (!adjusting.value || !adjustForm.qty || !adjustForm.note.trim()) {
    toast.error('กรุณาใส่จำนวนและหมายเหตุ')
    return
  }
  const signedQty = adjustForm.mode === 'in' ? Math.abs(adjustForm.qty) : -Math.abs(adjustForm.qty)
  saving.value = true
  try {
    await productService.adjustStock(adjusting.value.id, { qty: signedQty, type: adjustForm.type, note: adjustForm.note.trim() })
    toast.success('ปรับสต็อกแล้ว')
    showAdjust.value = false
    await load()
    if (history.value?.id === adjusting.value.id) await openHistory(adjusting.value)
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ปรับสต็อกไม่สำเร็จ'))
  } finally {
    saving.value = false
  }
}

// ---- history panel
const history = ref<Product | null>(null)
const movements = ref<StockMovement[]>([])
const histPage = ref(1)
const histTotal = ref(0)
const histLoading = ref(false)

async function openHistory(p: Product) {
  history.value = p
  histPage.value = 1
  await loadHistory()
}
async function loadHistory() {
  if (!history.value) return
  histLoading.value = true
  try {
    const { data } = await productService.stockMovements(history.value.id, { page: histPage.value, pageSize: 10 })
    movements.value = data.data.items
    histTotal.value = data.data.total
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดประวัติไม่สำเร็จ'))
  } finally {
    histLoading.value = false
  }
}
watch(histPage, loadHistory)

const typeLabel: Record<string, string> = { purchase: 'รับเข้า', sale: 'ขายออก', adjustment: 'ปรับยอด' }
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div>
        <h1 class="text-base font-bold text-text">สต็อกสินค้า</h1>
        <p class="text-xs text-text-muted">เฉพาะสินค้าที่เปิด "นับสต็อก" · เติมสต็อกและดูประวัติการเคลื่อนไหวที่นี่</p>
      </div>
    </header>

    <div class="flex flex-1 gap-4 overflow-hidden p-6">
      <div class="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        <div class="flex items-center gap-2 border-b border-border p-3">
          <div class="relative flex-1">
            <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input v-model="search" type="text" placeholder="ค้นหาชื่อหรือ SKU" class="w-full rounded-xl border border-border py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" />
          </div>
          <button
            class="flex items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-medium"
            :class="showLowOnly ? 'border-warning bg-warning/10 text-warning' : 'border-border text-ink-soft'"
            @click="showLowOnly = !showLowOnly"
          >
            <AlertTriangle :size="15" /> ใกล้หมด ({{ lowStockCount }})
          </button>
        </div>
        <div class="flex-1 overflow-y-auto">
          <table class="w-full text-left text-sm">
            <thead class="sticky top-0 border-b border-border bg-bg/90 text-xs text-text-muted">
              <tr>
                <th class="px-5 py-3 font-medium">สินค้า</th>
                <th class="px-5 py-3 text-right font-medium">คงเหลือ</th>
                <th class="px-5 py-3 text-right font-medium">ขั้นต่ำ</th>
                <th class="px-5 py-3" />
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="p in filtered" :key="p.id" class="hover:bg-bg/60">
                <td class="px-5 py-3">
                  <p class="font-medium text-text">{{ p.name }}</p>
                  <p class="text-xs text-text-muted">{{ p.sku || '—' }}</p>
                </td>
                <td class="px-5 py-3 text-right font-semibold" :class="stockCls(p)">{{ p.stockQty }} {{ p.unit }}</td>
                <td class="px-5 py-3 text-right text-text-muted">{{ p.minStock || '—' }}</td>
                <td class="whitespace-nowrap px-5 py-3 text-right">
                  <button class="mr-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary-soft" @click="openAdjust(p)">
                    <PackagePlus :size="14" /> ปรับสต็อก
                  </button>
                  <button class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft hover:bg-bg" @click="openHistory(p)">
                    <History :size="14" /> ประวัติ
                  </button>
                </td>
              </tr>
              <tr v-if="!loading && !filtered.length">
                <td colspan="4" class="py-14 text-center text-text-muted">
                  <Package class="mx-auto mb-2 h-8 w-8" :stroke-width="1.5" />
                  {{ trackedProducts.length ? 'ไม่พบสินค้าที่ค้นหา' : 'ยังไม่มีสินค้าที่เปิดนับสต็อก' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <aside v-if="history" class="w-80 shrink-0 overflow-y-auto rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div class="mb-3 flex items-start justify-between">
          <div>
            <p class="text-base font-bold text-text">{{ history.name }}</p>
            <p class="text-sm text-text-muted">คงเหลือ {{ history.stockQty }} {{ history.unit }}</p>
          </div>
          <button class="text-text-muted hover:text-text" @click="history = null"><X :size="18" /></button>
        </div>
        <p v-if="histLoading" class="text-sm text-text-muted">กำลังโหลด...</p>
        <ul v-else class="divide-y divide-border text-sm">
          <li v-for="m in movements" :key="m.id" class="py-2.5">
            <div class="flex justify-between">
              <span class="font-medium text-text">{{ typeLabel[m.type] }}</span>
              <span class="font-semibold" :class="m.qty >= 0 ? 'text-success' : 'text-danger'">{{ m.qty > 0 ? '+' : '' }}{{ m.qty }}</span>
            </div>
            <div class="flex justify-between text-xs text-text-muted">
              <span class="truncate">{{ m.note || (m.createdByName ?? '') }}</span>
              <span class="shrink-0">เหลือ {{ m.balanceAfter }}</span>
            </div>
            <p class="text-xs text-text-muted">{{ new Date(m.createdAt).toLocaleString('th-TH') }}{{ m.createdByName ? ` · ${m.createdByName}` : '' }}</p>
          </li>
          <li v-if="!movements.length" class="py-6 text-center text-text-muted">ยังไม่มีประวัติ</li>
        </ul>
        <PaginationBar v-model:page="histPage" :page-size="10" :total="histTotal" />
      </aside>
    </div>

    <div v-if="showAdjust && adjusting" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <form class="w-full max-w-sm space-y-3 rounded-3xl bg-surface p-6 shadow-xl" @submit.prevent="submitAdjust">
        <h2 class="text-lg font-bold text-text">ปรับสต็อก: {{ adjusting.name }}</h2>
        <p class="text-sm text-text-muted">คงเหลือปัจจุบัน {{ adjusting.stockQty }} {{ adjusting.unit }}</p>

        <div class="grid grid-cols-2 gap-2">
          <button type="button" class="rounded-xl border-2 py-2.5 text-sm font-semibold" :class="adjustForm.mode === 'in' ? 'border-success bg-success/10 text-success' : 'border-border text-ink-soft'" @click="adjustForm.mode = 'in'">
            + รับเข้า
          </button>
          <button type="button" class="rounded-xl border-2 py-2.5 text-sm font-semibold" :class="adjustForm.mode === 'out' ? 'border-danger bg-danger/10 text-danger' : 'border-border text-ink-soft'" @click="adjustForm.mode = 'out'">
            − ตัดออก
          </button>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-text-muted">จำนวน ({{ adjusting.unit }})</label>
          <input v-model.number="adjustForm.qty" type="number" min="0.001" step="any" class="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </div>

        <div v-if="adjustForm.mode === 'in'">
          <label class="mb-1 block text-xs font-semibold text-text-muted">ประเภท</label>
          <select v-model="adjustForm.type" class="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary">
            <option value="purchase">รับของเข้า (ซื้อเพิ่ม)</option>
            <option value="adjustment">ปรับยอด (นับสต็อกใหม่)</option>
          </select>
        </div>

        <div>
          <label class="mb-1 block text-xs font-semibold text-text-muted">หมายเหตุ *</label>
          <input v-model="adjustForm.note" type="text" maxlength="200" placeholder="เช่น รับของจากซัพพลายเออร์, ของเสีย, นับสต็อกประจำเดือน" class="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
        </div>

        <p class="rounded-xl bg-bg p-2.5 text-sm text-ink-soft">
          หลังปรับ จะเหลือ <strong>{{ adjustForm.mode === 'in' ? adjusting.stockQty + (adjustForm.qty || 0) : adjusting.stockQty - (adjustForm.qty || 0) }} {{ adjusting.unit }}</strong>
        </p>

        <div class="flex gap-2 pt-1">
          <button type="button" class="flex-1 rounded-xl border border-border py-2.5 text-sm text-ink-soft" @click="showAdjust = false">ยกเลิก</button>
          <button type="submit" class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving">บันทึก</button>
        </div>
      </form>
    </div>
  </div>
</template>
