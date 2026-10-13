<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { Tag, Pencil, Trash2, Plus, Check, X, ImagePlus, Wand2 } from '@lucide/vue'
import { useProductStore, errorMessage, imageSrc, type Product } from '../../store/modules/productStore'
import type { ProductInput } from '../../api/services/productService'
import { codeService } from '../../api/services/codeService'
import { productService } from '../../api/services/productService'
import PaginationBar from '../../components/PaginationBar.vue'
import { useProductIcon } from '../../composables/useProductIcon'

const { iconForCategory } = useProductIcon()

const productStore = useProductStore()

function showError(error: unknown, fallback: string) {
  toast.error(errorMessage(error, fallback))
}

onMounted(() => {
  productStore.load().catch((error: unknown) => showError(error, 'โหลดเมนูไม่สำเร็จ'))
  void loadPage()
})

const tab = ref<'products' | 'categories'>('products')
const search = ref('')
const categoryFilter = ref<number | 'all'>('all')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')

// server-side paging: the table only ever holds one page, however large the menu grows
const rows = ref<Product[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const tableLoading = ref(true)
let requestId = 0

async function loadPage() {
  const mine = (requestId += 1)
  tableLoading.value = true
  try {
    const result = await productService.listProductsPage({
      page: page.value,
      pageSize: pageSize.value,
      search: search.value.trim(),
      categoryId: categoryFilter.value === 'all' ? null : categoryFilter.value,
      status: statusFilter.value === 'all' ? null : statusFilter.value,
    })
    if (mine !== requestId) return // a newer request already replaced this one
    rows.value = result.items as Product[]
    total.value = result.total
    const lastPage = Math.max(Math.ceil(result.total / pageSize.value), 1)
    if (page.value > lastPage) {
      page.value = lastPage // e.g. deleted the last row of the last page
      await loadPage()
    }
  } catch (error: unknown) {
    if (mine === requestId) showError(error, 'โหลดรายการสินค้าไม่สำเร็จ')
  } finally {
    if (mine === requestId) tableLoading.value = false
  }
}

const reloadSoon = useDebounceFn(() => {
  page.value = 1
  void loadPage()
}, 300)
watch(search, reloadSoon)
watch([categoryFilter, statusFilter, pageSize], () => {
  page.value = 1
  void loadPage()
})
watch(page, () => void loadPage())

const MAX_IMAGE_BYTES = 2 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const emptyForm = (): ProductInput => ({
  name: '',
  price: 0,
  categoryId: productStore.categories[0]?.id ?? null,
  barcode: '',
  unit: 'ชิ้น',
  isActive: true,
  sku: '',
  description: '',
  cost: null,
  stockQty: 0,
  minStock: 0,
  trackStock: false,
})

const showProductModal = ref(false)
const editingProductId = ref<number | null>(null)
const productForm = reactive<ProductInput>(emptyForm())
const imageFile = ref<File | null>(null)
const imagePreview = ref<string | null>(null)
const removeExistingImage = ref(false)
const saving = ref(false)
const generating = ref<'sku' | 'barcode' | null>(null)

async function generateCode(kind: 'sku' | 'barcode') {
  generating.value = kind
  try {
    productForm[kind] = await codeService.generate(kind)
  } catch (error: unknown) {
    showError(error, 'สร้างรหัสไม่สำเร็จ')
  } finally {
    generating.value = null
  }
}

function resetImage(existing: string | null) {
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = null
  removeExistingImage.value = false
  imagePreview.value = imageSrc(existing)
}

function openCreateProduct() {
  editingProductId.value = null
  Object.assign(productForm, emptyForm())
  resetImage(null)
  showProductModal.value = true
}

function openEditProduct(product: Product) {
  editingProductId.value = product.id
  const { id: _id, imageUrl, ...rest } = product
  Object.assign(productForm, rest)
  resetImage(imageUrl)
  showProductModal.value = true
}

function onImagePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!ALLOWED_TYPES.includes(file.type)) {
    toast.error('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP')
    return
  }
  if (file.size > MAX_IMAGE_BYTES) {
    toast.error('ไฟล์รูปต้องมีขนาดไม่เกิน 2 MB')
    return
  }
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = file
  removeExistingImage.value = false
  imagePreview.value = URL.createObjectURL(file)
}

function clearImage() {
  if (imagePreview.value?.startsWith('blob:')) URL.revokeObjectURL(imagePreview.value)
  imageFile.value = null
  imagePreview.value = null
  removeExistingImage.value = true
}

// reload the visible page and the per-category counts after any change
async function refreshAll() {
  await Promise.all([loadPage(), productStore.load().catch(() => undefined)])
}

async function saveProduct() {
  if (!productForm.name.trim()) {
    toast.error('กรุณาใส่ชื่อสินค้า')
    return
  }
  if (productForm.price <= 0) {
    toast.error('ราคาต้องมากกว่า 0')
    return
  }

  // a cleared <input type="number"> yields '' rather than null/0, which the server rejects
  const payload: ProductInput = {
    ...productForm,
    price: Number(productForm.price) || 0,
    cost: typeof productForm.cost === 'number' ? productForm.cost : null,
    stockQty: Number(productForm.stockQty) || 0,
    minStock: Number(productForm.minStock) || 0,
  }

  saving.value = true
  try {
    let productId = editingProductId.value
    if (productId !== null) {
      await productStore.updateProduct(productId, payload)
    } else {
      productId = (await productStore.addProduct(payload)).id
    }

    try {
      if (imageFile.value) {
        await productStore.uploadImage(productId, imageFile.value)
      } else if (removeExistingImage.value) {
        await productStore.removeImage(productId)
      }
    } catch (error: unknown) {
      showError(error, 'บันทึกสินค้าแล้ว แต่อัปโหลดรูปไม่สำเร็จ')
      showProductModal.value = false
      await refreshAll()
      return
    }

    toast.success(editingProductId.value !== null ? 'แก้ไขสินค้าแล้ว' : 'เพิ่มสินค้าแล้ว')
    showProductModal.value = false
    await refreshAll()
  } catch (error: unknown) {
    showError(error, 'บันทึกสินค้าไม่สำเร็จ')
  } finally {
    saving.value = false
  }
}

async function removeProduct(product: Product) {
  if (!confirm(`ลบ "${product.name}" ออกจากเมนูใช่ไหม?`)) return
  try {
    await productStore.deleteProduct(product.id)
    toast.success('ลบสินค้าแล้ว')
    await refreshAll()
  } catch (error: unknown) {
    showError(error, 'ลบสินค้าไม่สำเร็จ')
  }
}

async function toggleActive(product: Product) {
  try {
    await productStore.toggleProductActive(product.id)
    await refreshAll()
  } catch (error: unknown) {
    showError(error, 'เปลี่ยนสถานะไม่สำเร็จ')
  }
}

const newCategoryName = ref('')

function productCount(categoryId: number) {
  return productStore.categories.find((c) => c.id === categoryId)?.productCount ?? 0
}
const editingCategoryId = ref<number | null>(null)
const editingCategoryName = ref('')

async function addCategory() {
  const name = newCategoryName.value.trim()
  if (!name) {
    toast.error('กรุณาใส่ชื่อหมวดหมู่')
    return
  }
  try {
    await productStore.addCategory(name)
    newCategoryName.value = ''
    toast.success('เพิ่มหมวดหมู่แล้ว')
  } catch (error: unknown) {
    showError(error, 'เพิ่มหมวดหมู่ไม่สำเร็จ')
  }
}

function startEditCategory(id: number, name: string) {
  editingCategoryId.value = id
  editingCategoryName.value = name
}

async function saveEditCategory() {
  if (editingCategoryId.value === null) return
  const name = editingCategoryName.value.trim()
  if (!name) return
  try {
    await productStore.updateCategory(editingCategoryId.value, name)
    editingCategoryId.value = null
    toast.success('แก้ไขหมวดหมู่แล้ว')
  } catch (error: unknown) {
    showError(error, 'แก้ไขหมวดหมู่ไม่สำเร็จ')
  }
}

async function removeCategory(id: number) {
  try {
    await productStore.deleteCategory(id)
    toast.success('ลบหมวดหมู่แล้ว')
  } catch (error: unknown) {
    showError(error, 'ลบหมวดหมู่ไม่สำเร็จ')
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
      <h1 class="text-base font-bold text-text">เมนูและโปรโมชั่น</h1>
      <div class="flex gap-1 rounded-full bg-bg p-1 text-sm font-medium">
        <button
          class="rounded-full px-4 py-1.5 transition"
          :class="tab === 'products' ? 'bg-ink text-white' : 'text-text-muted hover:text-text'"
          @click="tab = 'products'"
        >
          สินค้า
        </button>
        <button
          class="rounded-full px-4 py-1.5 transition"
          :class="tab === 'categories' ? 'bg-ink text-white' : 'text-text-muted hover:text-text'"
          @click="tab = 'categories'"
        >
          หมวดหมู่
        </button>
      </div>
    </header>

    <!-- สินค้า -->
    <div v-if="tab === 'products'" class="flex flex-1 flex-col overflow-hidden p-6">
      <div class="mb-4 flex flex-wrap items-center gap-3">
        <input
          v-model="search"
          type="text"
          placeholder="ค้นหาสินค้า..."
          class="w-56 rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <select
          v-model="categoryFilter"
          class="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">ทุกหมวดหมู่</option>
          <option v-for="cat in productStore.categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
        <select
          v-model="statusFilter"
          class="rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        >
          <option value="all">ทุกสถานะ</option>
          <option value="active">เปิดขาย</option>
          <option value="inactive">ปิดขาย</option>
        </select>
        <button
          class="ml-auto rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover"
          @click="openCreateProduct"
        >
          + เพิ่มสินค้า
        </button>
      </div>

      <div class="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <div class="flex-1 overflow-y-auto" :class="tableLoading ? 'opacity-60' : ''">
        <table class="w-full text-left text-sm">
          <thead class="sticky top-0 bg-bg text-xs font-semibold uppercase tracking-wide text-text-muted">
            <tr>
              <th class="px-4 py-3">สินค้า</th>
              <th class="px-4 py-3">หมวดหมู่</th>
              <th class="px-4 py-3">ราคา</th>
              <th class="px-4 py-3">บาร์โค้ด</th>
              <th class="px-4 py-3">สถานะ</th>
              <th class="px-4 py-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="product in rows" :key="product.id" class="hover:bg-bg/60">
              <td class="flex items-center gap-2 px-4 py-3 font-medium text-text">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-soft text-primary">
                  <img v-if="product.imageUrl" :src="imageSrc(product.imageUrl) ?? ''" :alt="product.name" class="h-full w-full object-cover" />
                  <component :is="iconForCategory(product.categoryId)" v-else class="h-4 w-4" :stroke-width="1.75" />
                </span>
                <span>
                  <span class="block">{{ product.name }}</span>
                  <span v-if="product.sku" class="block font-mono text-xs text-text-muted">{{ product.sku }}</span>
                </span>
              </td>
              <td class="px-4 py-3 text-text-muted">{{ productStore.categoryName(product.categoryId) }}</td>
              <td class="px-4 py-3 font-semibold text-text">฿{{ product.price.toFixed(0) }}</td>
              <td class="px-4 py-3 font-mono text-xs text-text-muted">{{ product.barcode }}</td>
              <td class="px-4 py-3">
                <button
                  class="rounded-full px-2.5 py-1 text-xs font-semibold transition"
                  :class="
                    product.isActive
                      ? 'bg-success/10 text-success hover:bg-success/20'
                      : 'bg-danger/10 text-danger hover:bg-danger/20'
                  "
                  @click="toggleActive(product)"
                >
                  {{ product.isActive ? 'เปิดขาย' : 'ปิดขาย' }}
                </button>
              </td>
              <td class="px-4 py-3 text-right">
                <button class="mr-3 text-sm font-medium text-primary hover:underline" @click="openEditProduct(product)">
                  แก้ไข
                </button>
                <button class="text-sm font-medium text-danger hover:underline" @click="removeProduct(product)">
                  ลบ
                </button>
              </td>
            </tr>
            <tr v-if="!rows.length && !tableLoading">
              <td colspan="6" class="px-4 py-10 text-center text-text-muted">ไม่พบสินค้า</td>
            </tr>
          </tbody>
        </table>
        </div>
        <PaginationBar v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </div>

    <!-- หมวดหมู่ -->
    <div v-else class="flex-1 overflow-y-auto p-6">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-base font-bold text-text">หมวดหมู่สินค้า</h2>
          <p class="text-sm text-text-muted">จัดกลุ่มเมนูเพื่อให้หาและเลือกขายได้เร็วขึ้น</p>
        </div>
        <div class="flex items-center gap-2 rounded-2xl border border-border bg-surface p-1.5 pl-4 shadow-sm focus-within:border-primary">
          <input
            v-model="newCategoryName"
            type="text"
            placeholder="ตั้งชื่อหมวดหมู่ใหม่"
            class="w-56 bg-transparent py-1.5 text-sm outline-none"
            @keyup.enter="addCategory"
          />
          <button
            class="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white transition hover:bg-primary-hover active:scale-95"
            @click="addCategory"
          >
            <Plus class="h-4 w-4" :stroke-width="2.5" />
            เพิ่ม
          </button>
        </div>
      </div>

      <div v-if="!productStore.categories.length" class="flex flex-col items-center justify-center rounded-3xl border border-dashed border-border bg-surface py-16 text-center">
        <span class="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <Tag class="h-7 w-7" :stroke-width="1.75" />
        </span>
        <p class="font-semibold text-text">ยังไม่มีหมวดหมู่</p>
        <p class="mt-1 text-sm text-text-muted">เริ่มต้นด้วยการตั้งชื่อหมวดหมู่แรกด้านบน เช่น เครื่องดื่ม หรือของหวาน</p>
      </div>

      <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-4">
        <div
          v-for="cat in productStore.categories"
          :key="cat.id"
          class="group flex flex-col justify-between rounded-3xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div class="flex items-start justify-between gap-3">
            <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <component :is="iconForCategory(cat.id)" class="h-5 w-5" :stroke-width="1.75" />
            </span>
            <div v-if="editingCategoryId !== cat.id" class="flex gap-1 opacity-0 transition group-hover:opacity-100">
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-bg hover:text-primary"
                title="แก้ไข"
                @click="startEditCategory(cat.id, cat.name)"
              >
                <Pencil class="h-4 w-4" :stroke-width="1.75" />
              </button>
              <button
                class="flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-danger/10 hover:text-danger"
                title="ลบ"
                @click="removeCategory(cat.id)"
              >
                <Trash2 class="h-4 w-4" :stroke-width="1.75" />
              </button>
            </div>
          </div>

          <div class="mt-4">
            <template v-if="editingCategoryId === cat.id">
              <input
                v-model="editingCategoryName"
                type="text"
                class="mb-2 w-full rounded-xl border border-primary px-3 py-2 text-sm outline-none"
                @keyup.enter="saveEditCategory"
                @keyup.esc="editingCategoryId = null"
              />
              <div class="flex gap-2">
                <button
                  class="flex flex-1 items-center justify-center gap-1 rounded-lg bg-primary py-1.5 text-xs font-bold text-white hover:bg-primary-hover"
                  @click="saveEditCategory"
                >
                  <Check class="h-3.5 w-3.5" :stroke-width="2.5" /> บันทึก
                </button>
                <button
                  class="flex flex-1 items-center justify-center gap-1 rounded-lg border border-border py-1.5 text-xs font-semibold text-text-muted hover:bg-bg"
                  @click="editingCategoryId = null"
                >
                  <X class="h-3.5 w-3.5" :stroke-width="2.5" /> ยกเลิก
                </button>
              </div>
            </template>
            <template v-else>
              <p class="truncate text-base font-bold text-text">{{ cat.name }}</p>
              <p class="mt-0.5 text-xs text-text-muted">{{ productCount(cat.id) }} รายการ</p>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: เพิ่ม/แก้ไขสินค้า -->
    <div v-if="showProductModal" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
      <div class="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-3xl bg-surface shadow-xl">
        <div class="border-b border-border px-6 py-4">
          <h2 class="text-lg font-bold text-text">
            {{ editingProductId !== null ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่' }}
          </h2>
        </div>

        <div class="grid flex-1 grid-cols-[180px_1fr] gap-6 overflow-y-auto px-6 py-5">
          <div>
            <p class="mb-1 text-xs font-semibold text-text-muted">รูปสินค้า</p>
            <label
              class="group relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-bg transition hover:border-primary"
            >
              <img v-if="imagePreview" :src="imagePreview" alt="รูปสินค้า" class="h-full w-full object-cover" />
              <span v-else class="flex flex-col items-center gap-1 text-text-muted group-hover:text-primary">
                <ImagePlus class="h-8 w-8" :stroke-width="1.5" />
                <span class="text-xs font-medium">เลือกรูป</span>
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" @change="onImagePicked" />
            </label>
            <button
              v-if="imagePreview"
              type="button"
              class="mt-2 w-full text-xs font-semibold text-danger hover:underline"
              @click="clearImage"
            >
              ลบรูป
            </button>
            <p class="mt-2 text-[11px] leading-snug text-text-muted">JPG, PNG หรือ WebP ไม่เกิน 2 MB</p>
          </div>

          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">ชื่อสินค้า *</label>
              <input v-model="productForm.name" type="text" class="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">ราคาขาย (บาท) *</label>
                <input v-model.number="productForm.price" type="number" min="0" step="0.01" class="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">ต้นทุน (บาท)</label>
                <input v-model.number="productForm.cost" type="number" min="0" step="0.01" class="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">หมวดหมู่</label>
                <select v-model.number="productForm.categoryId" class="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary">
                  <option :value="null">— ไม่ระบุ —</option>
                  <option v-for="cat in productStore.categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">หน่วยนับ</label>
                <input v-model="productForm.unit" type="text" class="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label class="mb-1 flex items-center justify-between text-xs font-semibold text-text-muted">
                  รหัส SKU
                  <button type="button" class="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50" :disabled="generating !== null" @click="generateCode('sku')">
                    <Wand2 class="h-3.5 w-3.5" :stroke-width="2" /> สร้างอัตโนมัติ
                  </button>
                </label>
                <input v-model="productForm.sku" type="text" class="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label class="mb-1 flex items-center justify-between text-xs font-semibold text-text-muted">
                  บาร์โค้ด
                  <button type="button" class="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50" :disabled="generating !== null" @click="generateCode('barcode')">
                    <Wand2 class="h-3.5 w-3.5" :stroke-width="2" /> สร้างอัตโนมัติ
                  </button>
                </label>
                <input v-model="productForm.barcode" type="text" inputmode="numeric" class="w-full rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
              </div>
            </div>

            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">คำอธิบาย</label>
              <textarea v-model="productForm.description" rows="2" class="w-full resize-none rounded-xl border border-border px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>

            <div class="rounded-2xl bg-bg p-3">
              <label class="flex items-center justify-between text-sm font-medium text-text">
                นับสต็อกสินค้านี้
                <input v-model="productForm.trackStock" type="checkbox" class="h-4 w-4 accent-primary" />
              </label>
              <div v-if="productForm.trackStock" class="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text-muted">คงเหลือปัจจุบัน</label>
                  <input v-model.number="productForm.stockQty" type="number" min="0" step="0.001" class="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text-muted">แจ้งเตือนเมื่อต่ำกว่า</label>
                  <input v-model.number="productForm.minStock" type="number" min="0" step="0.001" class="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary" />
                </div>
              </div>
            </div>

            <label class="flex items-center gap-2 text-sm text-text">
              <input v-model="productForm.isActive" type="checkbox" class="h-4 w-4 accent-primary" />
              เปิดขายสินค้านี้
            </label>
          </div>
        </div>

        <div class="flex gap-3 border-t border-border px-6 py-4">
          <button
            class="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-text-muted transition hover:bg-bg"
            @click="showProductModal = false"
          >
            ยกเลิก
          </button>
          <button
            class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
            :disabled="saving"
            @click="saveProduct"
          >
            {{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
