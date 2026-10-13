<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Store, Percent, Receipt, Gift, ImagePlus, Trash2 } from '@lucide/vue'
import { toast } from 'vue-sonner'
import ReceiptPaper from '../../components/ReceiptPaper.vue'
import type { OrderView } from '../../api/services/orderService'
import { customerService } from '../../api/services/customerService'
import { settingsService, type LoyaltySettings, type ReceiptOptions, type ShopSettings, type TaxSettings } from '../../api/services/settingsService'
import { errorMessage, imageSrc } from '../../store/modules/productStore'
import { useAuthStore } from '../../store/modules/authStore'

const authStore = useAuthStore()
const loading = ref(true)
type Section = 'shop' | 'tax' | 'receipt' | 'loyalty'
const section = ref<Section>('shop')
const sections = [
  { key: 'shop', label: 'ข้อมูลร้าน', icon: Store },
  { key: 'tax', label: 'ภาษี', icon: Percent },
  { key: 'receipt', label: 'ใบเสร็จ', icon: Receipt },
  { key: 'loyalty', label: 'สะสมแต้ม', icon: Gift },
] as const
const uploadingLogo = ref(false)
const MAX_LOGO_BYTES = 2 * 1024 * 1024

async function onLogoPicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    toast.error('รองรับเฉพาะไฟล์ JPG, PNG หรือ WebP')
    return
  }
  if (file.size > MAX_LOGO_BYTES) {
    toast.error('ไฟล์ใหญ่เกิน 2 MB')
    return
  }
  uploadingLogo.value = true
  try {
    shop.logoUrl = (await settingsService.uploadLogo(file)).data.data.shop.logoUrl
    toast.success('อัปโหลดโลโก้แล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'อัปโหลดโลโก้ไม่สำเร็จ'))
  } finally {
    uploadingLogo.value = false
  }
}

async function removeLogo() {
  try {
    shop.logoUrl = (await settingsService.removeLogo()).data.data.shop.logoUrl
    toast.success('ลบโลโก้แล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'ลบโลโก้ไม่สำเร็จ'))
  }
}
const savingShop = ref(false)
const savingTax = ref(false)

const shop = reactive<ShopSettings>({
  name: '',
  type: 'restaurant',
  hasDineIn: false,
  phone: '',
  address: '',
  logoAbbr: '',
  logoUrl: null,
  taxId: '',
  receiptFooter: '',
  promptPayId: '',
})
const loyalty = reactive<LoyaltySettings>({ enabled: false, bahtPerPoint: 25, pointsPerBaht: 10 })
const savingLoyalty = ref(false)
const receipt = reactive<ReceiptOptions>({
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showTaxId: true,
  showOrderNumber: true,
  showUnitPrice: true,
  paperWidth: 80,
  headerNote: '',
})
const receiptToggles = [
  { key: 'showLogo', label: 'แสดงโลโก้' },
  { key: 'showAddress', label: 'แสดงที่อยู่' },
  { key: 'showPhone', label: 'แสดงเบอร์โทร' },
  { key: 'showTaxId', label: 'แสดงเลขประจำตัวผู้เสียภาษี' },
  { key: 'showOrderNumber', label: 'แสดงเลขที่ออเดอร์' },
  { key: 'showUnitPrice', label: 'แสดงราคาต่อหน่วย (จำนวน × ราคา)' },
] as const
const sampleOrder: OrderView = {
  id: 0,
  orderNumber: 'AB20260101-00001',
  receiptNumber: 'AB-2026-000001',
  status: 'paid',
  subtotal: 190,
  discount: 0,
  discountName: null,
  tax: 0,
  total: 190,
  paymentMethod: 'cash',
  kitchenStatus: 'served',
  customerId: 1,
  customerName: 'คุณสมชาย',
  pointsRedeemed: 0,
  pointsEarned: 7,
  voidReason: null,
  voidedAt: null,
  createdAt: new Date().toISOString(),
  items: [
    { productId: 1, name: 'ลาเต้เย็น', qty: 2, price: 80 },
    { productId: 2, name: 'ชาไทยเย็น', qty: 1, price: 30 },
  ],
}
const tax = reactive<TaxSettings>({ enabled: false, name: 'VAT', rate: 7, isInclusive: true })

const shopTypes = [
  { value: 'restaurant', label: 'ร้านอาหาร' },
  { value: 'retail', label: 'ร้านค้าปลีก' },
  { value: 'cafe', label: 'คาเฟ่' },
  { value: 'salon', label: 'ร้านทำผม' },
  { value: 'nail', label: 'ร้านทำเล็บ' },
] as const

const canEdit = authStore.user?.role === 'owner' || authStore.user?.role === 'manager'
const inputClass =
  'w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary disabled:bg-bg disabled:text-text-muted'

onMounted(async () => {
  try {
    const { data } = await settingsService.get()
    Object.assign(shop, data.data.shop)
    Object.assign(tax, data.data.tax)
    Object.assign(receipt, data.data.receipt)
    Object.assign(loyalty, data.data.loyalty)
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'โหลดการตั้งค่าไม่สำเร็จ'))
  } finally {
    loading.value = false
  }
})

async function saveShop() {
  if (!shop.name.trim()) {
    toast.error('กรุณาใส่ชื่อร้าน')
    return
  }
  if (shop.taxId && !/^\d{13}$/.test(shop.taxId)) {
    toast.error('เลขประจำตัวผู้เสียภาษีต้องเป็นตัวเลข 13 หลัก')
    return
  }
  savingShop.value = true
  try {
    const { data } = await settingsService.updateShop({ ...shop, logoUrl: undefined })
    Object.assign(shop, data.data.shop)
    if (authStore.shop) {
      authStore.shop = { ...authStore.shop, name: data.data.shop.name }
      localStorage.setItem('shop', JSON.stringify(authStore.shop))
    }
    toast.success('บันทึกข้อมูลร้านแล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'บันทึกข้อมูลร้านไม่สำเร็จ'))
  } finally {
    savingShop.value = false
  }
}

async function saveReceipt() {
  savingShop.value = true
  try {
    const { data } = await settingsService.updateReceipt({ ...receipt, headerNote: receipt.headerNote.trim() })
    Object.assign(receipt, data.data.receipt)
    await settingsService.updateShop({ receiptFooter: shop.receiptFooter })
    toast.success('บันทึกรูปแบบใบเสร็จแล้ว')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'บันทึกรูปแบบใบเสร็จไม่สำเร็จ'))
  } finally {
    savingShop.value = false
  }
}

async function saveLoyalty() {
  if (!(loyalty.bahtPerPoint >= 1) || !(loyalty.pointsPerBaht >= 0.1)) {
    toast.error('กรุณากรอกอัตราให้ถูกต้อง')
    return
  }
  savingLoyalty.value = true
  try {
    const { data } = await settingsService.updateLoyalty({ ...loyalty })
    Object.assign(loyalty, data.data.loyalty)
    toast.success('บันทึกการตั้งค่าสะสมแต้มแล้ว มีผลกับบิลใหม่ทันที')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'บันทึกการตั้งค่าสะสมแต้มไม่สำเร็จ'))
  } finally {
    savingLoyalty.value = false
  }
}

const recalculatingAll = ref(false)
async function recalculateAll() {
  if (!confirm('คำนวณแต้มให้บิลเก่าที่ลูกค้าสมาชิกยังไม่เคยได้แต้ม ตามอัตราปัจจุบัน ดำเนินการต่อไหม?')) return
  recalculatingAll.value = true
  try {
    const { data } = await customerService.recalculatePoints()
    if (data.data.orders === 0) toast.info('ไม่มีบิลที่ต้องคำนวณแต้มเพิ่ม')
    else toast.success(`คำนวณแต้มจาก ${data.data.orders} บิล เพิ่มทั้งหมด ${data.data.points} แต้ม`)
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'คำนวณแต้มไม่สำเร็จ'))
  } finally {
    recalculatingAll.value = false
  }
}

async function saveTax() {
  if (tax.enabled && (tax.rate < 0 || tax.rate > 100)) {
    toast.error('อัตราภาษีต้องอยู่ระหว่าง 0–100%')
    return
  }
  savingTax.value = true
  try {
    const { data } = await settingsService.updateTax({ ...tax })
    Object.assign(tax, data.data.tax)
    toast.success('บันทึกการตั้งค่าภาษีแล้ว มีผลกับบิลใหม่ทันที')
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'บันทึกการตั้งค่าภาษีไม่สำเร็จ'))
  } finally {
    savingTax.value = false
  }
}
</script>

<template>
  <div class="flex h-full flex-col">
    <header class="border-b border-border bg-surface px-6 py-3">
      <h1 class="text-base font-bold text-text">ตั้งค่า</h1>
    </header>

    <div class="flex-1 overflow-y-auto p-6">
      <p v-if="loading" class="text-sm text-text-muted">กำลังโหลด...</p>
      <div v-else class="mx-auto flex max-w-4xl flex-col gap-6 md:flex-row md:items-start">
        <nav class="flex gap-1 rounded-2xl bg-surface p-2 shadow-sm md:w-52 md:flex-col md:shrink-0">
          <button
            v-for="item in sections"
            :key="item.key"
            class="flex flex-1 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition md:flex-none"
            :class="section === item.key ? 'bg-primary-soft text-primary' : 'text-ink-soft hover:bg-bg'"
            @click="section = item.key"
          >
            <component :is="item.icon" :size="18" /> {{ item.label }}
          </button>
        </nav>
        <div class="min-w-0 flex-1 space-y-4">
          <p v-if="!canEdit" class="rounded-xl bg-warning/10 p-3 text-sm text-warning">
            คุณดูการตั้งค่าได้อย่างเดียว เฉพาะเจ้าของร้านและผู้จัดการเท่านั้นที่แก้ไขได้
          </p>
        <section v-show="section === 'shop'" class="space-y-6">
          <div class="rounded-3xl bg-surface p-6 shadow-sm">
          <h2 class="mb-1 text-base font-bold text-text">โลโก้ร้าน</h2>
          <p class="mb-4 text-sm text-text-muted">แสดงบนหัวใบเสร็จ JPG, PNG หรือ WebP ไม่เกิน 2 MB</p>
          <div class="flex items-center gap-4">
            <div class="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-bg text-xs text-text-muted">
              <img v-if="shop.logoUrl" :src="imageSrc(shop.logoUrl) ?? ''" alt="โลโก้ร้าน" class="h-full w-full object-contain" />
              <span v-else>ยังไม่มีโลโก้</span>
            </div>
            <div v-if="canEdit" class="flex flex-col gap-2">
              <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-ink-soft hover:border-primary">
                <ImagePlus :size="16" /> {{ uploadingLogo ? 'กำลังอัปโหลด...' : 'อัปโหลดโลโก้' }}
                <input type="file" accept="image/jpeg,image/png,image/webp" class="hidden" :disabled="uploadingLogo" @change="onLogoPicked" />
              </label>
              <button v-if="shop.logoUrl" type="button" class="inline-flex items-center gap-2 text-sm text-danger hover:underline" @click="removeLogo"><Trash2 :size="14" /> ลบโลโก้</button>
            </div>
          </div>
          </div>
          <div class="rounded-3xl bg-surface p-6 shadow-sm">
          <h2 class="mb-1 text-base font-bold text-text">ข้อมูลร้าน</h2>
          <p class="mb-4 text-sm text-text-muted">แสดงบนหัวใบเสร็จ</p>
          <form class="space-y-3" @submit.prevent="saveShop">
            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">ชื่อร้าน *</label>
              <input v-model="shop.name" :disabled="!canEdit" type="text" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">ประเภทร้าน</label>
              <select v-model="shop.type" :disabled="!canEdit" :class="inputClass">
                <option v-for="opt in shopTypes" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">เบอร์โทร</label>
                <input v-model="shop.phone" :disabled="!canEdit" type="text" :class="inputClass" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">อักษรย่อ</label>
                <input v-model="shop.logoAbbr" :disabled="!canEdit" maxlength="3" type="text" :class="inputClass" />
              </div>
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">ที่อยู่</label>
              <input v-model="shop.address" :disabled="!canEdit" type="text" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">เลขพร้อมเพย์ (เบอร์มือถือ 10 หลัก หรือเลขบัตรประชาชน 13 หลัก)</label>
              <input v-model="shop.promptPayId" :disabled="!canEdit" inputmode="numeric" maxlength="15" placeholder="ใช้สร้าง QR รับเงินตอนชำระ" type="text" :class="inputClass" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold text-text-muted">เลขประจำตัวผู้เสียภาษี (13 หลัก)</label>
              <input v-model="shop.taxId" :disabled="!canEdit" inputmode="numeric" maxlength="13" type="text" :class="inputClass" />
            </div>
            <label class="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
              มีโต๊ะนั่งทานในร้าน (dine-in)
              <input v-model="shop.hasDineIn" :disabled="!canEdit" type="checkbox" class="h-4 w-4 accent-primary" />
            </label>
            <button
              v-if="canEdit"
              type="submit"
              class="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
              :disabled="savingShop"
            >
              {{ savingShop ? 'กำลังบันทึก...' : 'บันทึกข้อมูลร้าน' }}
            </button>
          </form>
        </div>
        </section>
        <section v-show="section === 'tax'" class="rounded-3xl bg-surface p-6 shadow-sm">
          <h2 class="mb-1 text-base font-bold text-text">ภาษีมูลค่าเพิ่ม (VAT)</h2>
          <p class="mb-4 text-sm text-text-muted">มีผลกับบิลที่สร้างหลังจากนี้ ไม่แก้บิลเก่า</p>
          <form class="space-y-3" @submit.prevent="saveTax">
            <label class="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm font-medium">
              เปิดใช้งาน VAT
              <input v-model="tax.enabled" :disabled="!canEdit" type="checkbox" class="h-4 w-4 accent-primary" />
            </label>
            <template v-if="tax.enabled">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text-muted">ชื่อภาษี</label>
                  <input v-model="tax.name" :disabled="!canEdit" type="text" :class="inputClass" />
                </div>
                <div>
                  <label class="mb-1 block text-xs font-semibold text-text-muted">อัตรา (%)</label>
                  <input v-model.number="tax.rate" :disabled="!canEdit" type="number" min="0" max="100" step="0.01" :class="inputClass" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  :disabled="!canEdit"
                  class="rounded-xl border-2 px-3 py-3 text-left text-sm transition"
                  :class="tax.isInclusive ? 'border-primary bg-primary-soft' : 'border-border'"
                  @click="tax.isInclusive = true"
                >
                  <span class="block font-semibold text-text">ราคารวม VAT แล้ว</span>
                  <span class="text-xs text-text-muted">ราคาที่ตั้งไว้คือราคาที่ลูกค้าจ่าย</span>
                </button>
                <button
                  type="button"
                  :disabled="!canEdit"
                  class="rounded-xl border-2 px-3 py-3 text-left text-sm transition"
                  :class="!tax.isInclusive ? 'border-primary bg-primary-soft' : 'border-border'"
                  @click="tax.isInclusive = false"
                >
                  <span class="block font-semibold text-text">ราคายังไม่รวม VAT</span>
                  <span class="text-xs text-text-muted">บวก VAT เพิ่มตอนคิดเงิน</span>
                </button>
              </div>
            </template>
            <button
              v-if="canEdit"
              type="submit"
              class="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50"
              :disabled="savingTax"
            >
              {{ savingTax ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่าภาษี' }}
            </button>
          </form>
        </section>
        <section v-show="section === 'loyalty'" class="rounded-3xl bg-surface p-6 shadow-sm">
          <h2 class="mb-1 text-base font-bold text-text">สะสมแต้มสมาชิก</h2>
          <p class="mb-4 text-sm text-text-muted">แต้มคิดจากยอดสุทธิที่ลูกค้าจ่ายจริง ปัดลงเป็นจำนวนเต็ม ถ้ายกเลิกบิล แต้มจะถูกคืนและหักกลับให้อัตโนมัติ</p>
          <form class="space-y-3" @submit.prevent="saveLoyalty">
            <label class="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm font-medium">
              เปิดใช้ระบบสะสมแต้ม
              <input v-model="loyalty.enabled" :disabled="!canEdit" type="checkbox" class="h-4 w-4 accent-primary" />
            </label>
            <template v-if="loyalty.enabled">
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">ซื้อทุกกี่บาท ได้ 1 แต้ม</label>
                <input v-model.number="loyalty.bahtPerPoint" :disabled="!canEdit" type="number" min="1" step="1" :class="inputClass" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">กี่แต้ม แลกเป็นส่วนลด 1 บาท</label>
                <input v-model.number="loyalty.pointsPerBaht" :disabled="!canEdit" type="number" min="0.1" step="0.1" :class="inputClass" />
              </div>
              <p class="rounded-xl bg-primary-soft p-3 text-sm text-primary">
                ตัวอย่าง: ซื้อ 100 บาท ได้ {{ Math.floor(100 / (loyalty.bahtPerPoint || 1)) }} แต้ม · 100 แต้ม แลกส่วนลดได้ ฿{{ (100 / (loyalty.pointsPerBaht || 1)).toFixed(2) }}
              </p>
            </template>
            <button v-if="canEdit" type="submit" class="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50" :disabled="savingLoyalty">
              {{ savingLoyalty ? 'กำลังบันทึก...' : 'บันทึก' }}
            </button>
            <div v-if="canEdit && loyalty.enabled" class="border-t border-dashed border-border pt-3">
              <p class="mb-2 text-xs text-text-muted">บิลที่ขายให้สมาชิกก่อนเปิดระบบนี้ยังไม่ได้แต้ม กดเพื่อคำนวณให้ตามอัตราที่ตั้งไว้ (บันทึกอัตราก่อน) บิลที่เคยได้แต้มแล้วจะไม่ถูกนับซ้ำ</p>
              <button type="button" class="w-full rounded-xl border border-primary py-2.5 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-50" :disabled="recalculatingAll" @click="recalculateAll">
                {{ recalculatingAll ? 'กำลังคำนวณ...' : 'คำนวณแต้มย้อนหลังอัตโนมัติ' }}
              </button>
            </div>
          </form>
        </section>

        <section v-show="section === 'receipt'" class="grid gap-6 lg:grid-cols-[1fr_auto]">
          <div class="rounded-3xl bg-surface p-6 shadow-sm">
            <h2 class="mb-1 text-base font-bold text-text">รูปแบบใบเสร็จ</h2>
            <p class="mb-4 text-sm text-text-muted">เลือกสิ่งที่แสดงบนใบเสร็จ ดูตัวอย่างทางขวาได้ทันที ชื่อร้าน ที่อยู่ เบอร์โทร และเลขผู้เสียภาษีแก้ที่ "ข้อมูลร้าน"</p>
            <form class="space-y-3" @submit.prevent="saveReceipt">
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">ขนาดกระดาษ</label>
                <div class="grid grid-cols-2 gap-2">
                  <button v-for="w in [58, 80] as const" :key="w" type="button" :disabled="!canEdit" class="rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition" :class="receipt.paperWidth === w ? 'border-primary bg-primary-soft text-primary' : 'border-border text-ink-soft'" @click="receipt.paperWidth = w">{{ w }} มม.</button>
                </div>
              </div>
              <label v-for="t in receiptToggles" :key="t.key" class="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
                {{ t.label }}
                <input v-model="receipt[t.key]" :disabled="!canEdit" type="checkbox" class="h-4 w-4 accent-primary" />
              </label>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">ข้อความใต้ชื่อร้าน (ไม่บังคับ)</label>
                <input v-model="receipt.headerNote" :disabled="!canEdit" maxlength="200" placeholder="เช่น สาขาสยาม เปิด 10:00-22:00" type="text" :class="inputClass" />
              </div>
              <div>
                <label class="mb-1 block text-xs font-semibold text-text-muted">ข้อความท้ายใบเสร็จ</label>
                <input v-model="shop.receiptFooter" :disabled="!canEdit" maxlength="300" placeholder="เช่น ขอบคุณที่ใช้บริการ" type="text" :class="inputClass" />
              </div>
              <button v-if="canEdit" type="submit" class="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white transition hover:bg-primary-hover disabled:opacity-50" :disabled="savingShop">
                {{ savingShop ? 'กำลังบันทึก...' : 'บันทึกรูปแบบใบเสร็จ' }}
              </button>
            </form>
          </div>
          <div class="rounded-3xl bg-bg p-4 lg:w-[400px]">
            <p class="mb-3 text-center text-xs font-semibold text-text-muted">ตัวอย่าง</p>
            <ReceiptPaper :order="sampleOrder" :shop="shop" :options="receipt" :received="200" :change="10" />
          </div>
        </section>
        </div>
      </div>
    </div>
  </div>
</template>
