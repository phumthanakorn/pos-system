<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { Plus, Pencil, Trash2, Search, Wand2 } from '@lucide/vue'
import {
  inventoryService,
  type IngredientInput,
  type IngredientView,
} from '../../api/services/inventoryService'
import { errorMessage } from '../../store/modules/productStore'
import PaginationBar from '../../components/PaginationBar.vue'
import { codeService } from '../../api/services/codeService'

interface CategoryRow {
  id: number
  name: string
}

const ingredients = ref<IngredientView[]>([])
const categories = ref<CategoryRow[]>([])
const loading = ref(true)
const search = ref('')
const categoryFilter = ref<number | 'all'>('all')

const newCategoryName = ref('')

const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const lowStockCount = ref(0)
let requestId = 0

async function loadCategories() {
  try {
    categories.value = (await inventoryService.listCategories()).data.data
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดหมวดหมู่ไม่สำเร็จ'))
  }
}

async function load() {
  const mine = (requestId += 1)
  loading.value = true
  try {
    const { data } = await inventoryService.listIngredients({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value.trim(),
      categoryId: categoryFilter.value === 'all' ? null : categoryFilter.value,
    })
    if (mine !== requestId) return // a newer request already replaced this one
    ingredients.value = data.data.items
    total.value = data.data.total
    lowStockCount.value = data.data.lowStockCount
    if (page.value > data.data.totalPages) {
      page.value = data.data.totalPages
      await load()
    }
  } catch (error: unknown) {
    if (mine === requestId) toast.error(errorMessage(error, 'โหลดคลังสินค้าไม่สำเร็จ'))
  } finally {
    if (mine === requestId) loading.value = false
  }
}

const reloadSoon = useDebounceFn(() => {
  page.value = 1
  void load()
}, 300)
watch(search, reloadSoon)
watch([categoryFilter, pageSize], () => {
  page.value = 1
  void load()
})
watch(page, () => void load())

onMounted(() => {
  void loadCategories()
  void load()
})

const showModal = ref(false)
const generating = ref<'sku' | 'barcode' | null>(null)

async function generateCode(kind: 'sku' | 'barcode') {
  generating.value = kind
  try {
    form[kind] = await codeService.generate(kind)
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'สร้างรหัสไม่สำเร็จ'))
  } finally {
    generating.value = null
  }
}
const editingId = ref<number | null>(null)
const form = reactive<IngredientInput>(emptyForm())

function emptyForm(): IngredientInput {
  return {
    name: '',
    categoryId: null,
    sku: '',
    barcode: '',
    unit: 'g',
    costPerUnit: 0,
    stockQty: 0,
    minStock: 0,
    supplierName: '',
    yieldPercent: 100,
    purchaseUnit: '',
    purchaseQty: null,
    purchasePrice: null,
    note: '',
    isActive: true,
  }
}

function openCreate() {
  editingId.value = null
  Object.assign(form, emptyForm())
  showModal.value = true
}

function openEdit(item: IngredientView) {
  editingId.value = item.id
  Object.assign(form, {
    name: item.name,
    categoryId: item.categoryId,
    sku: item.sku,
    barcode: item.barcode,
    unit: item.unit,
    costPerUnit: item.costPerUnit,
    stockQty: item.stockQty,
    minStock: item.minStock,
    supplierName: item.supplierName,
    yieldPercent: item.yieldPercent,
    purchaseUnit: item.purchaseUnit,
    purchaseQty: item.purchaseQty,
    purchasePrice: item.purchasePrice,
    note: item.note,
    isActive: item.isActive,
  })
  showModal.value = true
}

async function save() {
  if (!form.name.trim()) {
    toast.error('กรุณาใส่ชื่อวัตถุดิบ')
    return
  }
  if (form.yieldPercent <= 0 || form.yieldPercent > 100) {
    toast.error('Yield ต้องอยู่ระหว่าง 1–100%')
    return
  }
  try {
    if (editingId.value !== null) {
      await inventoryService.updateIngredient(editingId.value, { ...form })
      toast.success('แก้ไขวัตถุดิบแล้ว')
    } else {
      await inventoryService.createIngredient({ ...form })
      page.value = 1
      toast.success('เพิ่มวัตถุดิบแล้ว')
    }
    showModal.value = false
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'บันทึกวัตถุดิบไม่สำเร็จ'))
  }
}

async function remove(item: IngredientView) {
  if (!confirm(`ลบ "${item.name}" ใช่ไหม?`)) return
  try {
    await inventoryService.removeIngredient(item.id)
    toast.success('ลบวัตถุดิบแล้ว')
    await load()
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ลบวัตถุดิบไม่สำเร็จ'))
  }
}

async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) return
  try {
    const { data } = await inventoryService.createCategory(name)
    categories.value.push(data.data)
    newCategoryName.value = ''
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'เพิ่มหมวดหมู่ไม่สำเร็จ'))
  }
}

async function removeCategory(cat: CategoryRow) {
  try {
    await inventoryService.removeCategory(cat.id)
    categories.value = categories.value.filter((c) => c.id !== cat.id)
    if (categoryFilter.value === cat.id) categoryFilter.value = 'all'
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ลบหมวดหมู่ไม่สำเร็จ'))
  }
}

const inputClass = 'w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary'
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <div>
        <h1 class="text-base font-bold text-text">คลังสินค้า (วัตถุดิบ)</h1>
        <p class="text-xs text-text-muted">
          {{ total.toLocaleString('th-TH') }} รายการ
          <span v-if="lowStockCount" class="ml-2 font-semibold text-warning">· ใกล้หมด {{ lowStockCount }} รายการ</span>
        </p>
      </div>
      <button
        class="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" :stroke-width="2.5" />
        เพิ่มวัตถุดิบ
      </button>
    </header>

    <div class="grid flex-1 grid-cols-[1fr_260px] gap-4 overflow-hidden p-4">
      <div class="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <div class="flex flex-wrap items-center gap-2 border-b border-border p-3">
          <div class="flex items-center gap-2 rounded-xl border border-border px-3">
            <Search class="h-4 w-4 text-text-muted" :stroke-width="1.75" />
            <input v-model="search" type="text" placeholder="ค้นหาชื่อ SKU หรือบาร์โค้ด" class="py-2 text-sm outline-none" />
          </div>
          <select v-model="categoryFilter" class="rounded-xl border border-border px-3 py-2 text-sm outline-none">
            <option value="all">ทุกหมวดหมู่</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>

        <div class="flex-1 overflow-y-auto">
          <div v-if="loading" class="p-6 text-sm text-text-muted">กำลังโหลด...</div>
          <table v-else-if="ingredients.length" class="w-full text-left text-sm">
            <thead class="sticky top-0 bg-bg text-xs font-semibold uppercase tracking-wide text-text-muted">
              <tr>
                <th class="px-4 py-3">วัตถุดิบ</th>
                <th class="px-4 py-3">หมวดหมู่</th>
                <th class="px-4 py-3">คงเหลือ</th>
                <th class="px-4 py-3">ต้นทุน/หน่วย</th>
                <th class="px-4 py-3">สถานะ</th>
                <th class="px-4 py-3 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr v-for="item in ingredients" :key="item.id" class="hover:bg-bg/60">
                <td class="px-4 py-3">
                  <p class="font-semibold text-text">{{ item.name }}</p>
                  <p class="font-mono text-xs text-text-muted">{{ item.sku || item.barcode || '—' }}</p>
                </td>
                <td class="px-4 py-3 text-text-muted">{{ item.categoryName ?? '—' }}</td>
                <td class="px-4 py-3 font-semibold" :class="item.isLowStock ? 'text-warning' : 'text-text'">
                  {{ item.stockQty }} {{ item.unit }}
                </td>
                <td class="px-4 py-3">฿{{ item.costPerUnit.toFixed(2) }}</td>
                <td class="px-4 py-3">
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="item.isLowStock ? 'bg-warning/15 text-warning' : 'bg-success/10 text-success'"
                  >
                    {{ item.isLowStock ? 'ใกล้หมด' : 'ปกติ' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-right">
                  <button class="mr-2 inline-flex text-primary hover:underline" @click="openEdit(item)">
                    <Pencil class="h-4 w-4" :stroke-width="1.75" />
                  </button>
                  <button class="inline-flex text-danger hover:underline" @click="remove(item)">
                    <Trash2 class="h-4 w-4" :stroke-width="1.75" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="p-10 text-center text-sm text-text-muted">ยังไม่มีวัตถุดิบ</div>
        </div>
        <PaginationBar v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>

      <aside class="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 class="text-sm font-bold text-text">หมวดหมู่วัตถุดิบ</h2>
        <div class="flex gap-2">
          <input v-model="newCategoryName" type="text" placeholder="ชื่อหมวดหมู่" :class="inputClass" @keyup.enter="addCategory" />
          <button class="rounded-xl bg-primary px-3 text-sm font-bold text-white hover:bg-primary-hover" @click="addCategory">+</button>
        </div>
        <ul class="divide-y divide-border">
          <li v-for="cat in categories" :key="cat.id" class="flex items-center justify-between py-2 text-sm">
            <span class="text-text">{{ cat.name }}</span>
            <button class="text-xs font-semibold text-danger hover:underline" @click="removeCategory(cat)">ลบ</button>
          </li>
          <li v-if="!categories.length" class="py-2 text-xs text-text-muted">ยังไม่มีหมวดหมู่</li>
        </ul>
      </aside>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div class="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl bg-surface shadow-xl">
        <div class="border-b border-border px-6 py-4">
          <h2 class="text-lg font-bold text-text">{{ editingId !== null ? 'แก้ไขวัตถุดิบ' : 'เพิ่มวัตถุดิบ' }}</h2>
        </div>
        <div class="grid flex-1 grid-cols-2 gap-3 overflow-y-auto px-6 py-4">
          <div class="col-span-2">
            <label class="mb-1 block text-xs font-semibold text-text-muted">ชื่อวัตถุดิบ *</label>
            <input v-model="form.name" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">หมวดหมู่</label>
            <select v-model.number="form.categoryId" :class="inputClass">
              <option :value="null">— ไม่ระบุ —</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
            </select>
          </div>
          <div>
            <label class="mb-1 flex items-center justify-between text-xs font-semibold text-text-muted">
              รหัส SKU
              <button type="button" class="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50" :disabled="generating !== null" @click="generateCode('sku')">
                <Wand2 class="h-3.5 w-3.5" :stroke-width="2" /> สร้างอัตโนมัติ
              </button>
            </label>
            <input v-model="form.sku" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 flex items-center justify-between text-xs font-semibold text-text-muted">
              บาร์โค้ด
              <button type="button" class="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50" :disabled="generating !== null" @click="generateCode('barcode')">
                <Wand2 class="h-3.5 w-3.5" :stroke-width="2" /> สร้างอัตโนมัติ
              </button>
            </label>
            <input v-model="form.barcode" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">หน่วยใช้ (เช่น g, ml)</label>
            <input v-model="form.unit" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">ต้นทุนต่อหน่วย (฿)</label>
            <input v-model.number="form.costPerUnit" type="number" min="0" step="0.0001" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">คงเหลือปัจจุบัน</label>
            <input v-model.number="form.stockQty" type="number" min="0" step="0.001" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">แจ้งเตือนเมื่อต่ำกว่า</label>
            <input v-model.number="form.minStock" type="number" min="0" step="0.001" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">Yield ใช้งานได้ (%)</label>
            <input v-model.number="form.yieldPercent" type="number" min="1" max="100" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">ผู้จำหน่าย</label>
            <input v-model="form.supplierName" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">หน่วยซื้อ (เช่น ลัง 12 ขวด)</label>
            <input v-model="form.purchaseUnit" type="text" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">ปริมาณต่อหน่วยซื้อ</label>
            <input v-model.number="form.purchaseQty" type="number" min="0" step="0.001" :class="inputClass" />
          </div>
          <div>
            <label class="mb-1 block text-xs font-semibold text-text-muted">ราคาต่อหน่วยซื้อ (฿)</label>
            <input v-model.number="form.purchasePrice" type="number" min="0" step="0.01" :class="inputClass" />
          </div>
          <div class="col-span-2">
            <label class="mb-1 block text-xs font-semibold text-text-muted">หมายเหตุ</label>
            <input v-model="form.note" type="text" :class="inputClass" />
          </div>
        </div>
        <div class="flex gap-3 border-t border-border px-6 py-4">
          <button
            class="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted hover:bg-bg"
            @click="showModal = false"
          >
            ยกเลิก
          </button>
          <button class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white hover:bg-primary-hover" @click="save">
            บันทึก
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
