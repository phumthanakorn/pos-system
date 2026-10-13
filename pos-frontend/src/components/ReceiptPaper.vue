<script setup lang="ts">
import type { OrderView } from '../api/services/orderService'
import type { ReceiptOptions, ShopSettings } from '../api/services/settingsService'
import { imageSrc } from '../store/modules/productStore'

withDefaults(
  defineProps<{
    order: OrderView
    shop: ShopSettings | null
    options: ReceiptOptions
    shopName?: string
    received?: number
    change?: number
    forPrint?: boolean
  }>(),
  { shopName: '', received: undefined, change: undefined, forPrint: false },
)

const methodLabel: Record<string, string> = { cash: 'เงินสด', card: 'บัตร', qr: 'QR / พร้อมเพย์' }
const baht = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const dateText = (iso: string) => new Date(iso).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
const timeText = (iso: string) => new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
const itemCount = (o: OrderView) => o.items.reduce((sum, i) => sum + i.qty, 0)
</script>

<template>
  <!-- the printed page size follows the configured paper width -->
  <component :is="'style'" v-if="forPrint">@media print { @page { size: {{ options.paperWidth }}mm auto; margin: 3mm; } }</component>
  <div :id="forPrint ? 'receipt-print' : undefined" class="receipt-paper mx-auto bg-white text-[13px] leading-relaxed text-ink" :style="{ maxWidth: options.paperWidth === 58 ? '260px' : '360px' }">
    <!-- header -->
    <div class="px-6 pt-7 text-center">
      <img v-if="options.showLogo && shop?.logoUrl" :src="imageSrc(shop.logoUrl) ?? ''" alt="" class="mx-auto mb-2 h-14 max-w-[160px] object-contain" />
      <div v-else-if="options.showLogo && shop?.logoAbbr" class="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-ink text-sm font-bold tracking-wide text-white">
        {{ shop.logoAbbr }}
      </div>
      <p class="text-lg font-bold">{{ shop?.name || shopName }}</p>
      <p v-if="options.showAddress && shop?.address" class="text-xs text-text-muted">{{ shop.address }}</p>
      <p v-if="options.showPhone && shop?.phone" class="text-xs text-text-muted">โทร {{ shop.phone }}</p>
      <p v-if="options.showTaxId && shop?.taxId" class="text-xs text-text-muted">เลขประจำตัวผู้เสียภาษี {{ shop.taxId }}</p>
      <p v-if="options.headerNote" class="mt-1 text-xs">{{ options.headerNote }}</p>
      <p class="mt-4 text-sm font-bold tracking-[0.2em]">ใบเสร็จรับเงิน</p>
      <p class="text-[10px] tracking-[0.3em] text-text-muted">RECEIPT</p>
    </div>

    <!-- document info -->
    <dl class="mx-6 mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 border-y border-dashed border-ink-soft/50 py-3 text-xs">
      <dt class="text-text-muted">เลขที่ใบเสร็จ</dt>
      <dd class="text-right font-semibold tabular-nums">{{ order.receiptNumber }}</dd>
      <template v-if="options.showOrderNumber">
        <dt class="text-text-muted">เลขที่ออเดอร์</dt>
        <dd class="text-right tabular-nums">{{ order.orderNumber }}</dd>
      </template>
      <dt class="text-text-muted">วันที่</dt>
      <dd class="text-right tabular-nums">{{ dateText(order.createdAt) }}</dd>
      <dt class="text-text-muted">เวลา</dt>
      <dd class="text-right tabular-nums">{{ timeText(order.createdAt) }}</dd>
      <template v-if="order.customerName">
        <dt class="text-text-muted">สมาชิก</dt>
        <dd class="text-right">{{ order.customerName }}</dd>
      </template>
    </dl>

    <!-- items -->
    <div class="mx-6 mt-3">
      <div class="flex justify-between border-b border-ink-soft/30 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        <span>รายการ</span><span>จำนวนเงิน</span>
      </div>
      <div v-for="item in order.items" :key="item.productId" class="py-1.5">
        <div class="flex justify-between gap-3">
          <span class="font-medium">{{ item.name }}</span>
          <span class="tabular-nums">{{ baht(item.qty * item.price) }}</span>
        </div>
        <div v-if="options.showUnitPrice" class="text-xs text-text-muted tabular-nums">{{ item.qty }} × {{ baht(item.price) }}</div>
      </div>
    </div>

    <!-- totals -->
    <div class="mx-6 mt-1 space-y-0.5 border-t border-dashed border-ink-soft/50 pt-3 text-xs">
      <div class="flex justify-between text-text-muted"><span>จำนวนรวม {{ itemCount(order) }} ชิ้น</span><span class="tabular-nums">{{ baht(order.subtotal) }}</span></div>
      <div v-if="order.discount > 0" class="flex justify-between text-text-muted">
        <span>ส่วนลด{{ order.discountName ? ` (${order.discountName})` : '' }}</span><span class="tabular-nums">-{{ baht(order.discount) }}</span>
      </div>
      <div v-if="order.tax > 0" class="flex justify-between text-text-muted"><span>ภาษีมูลค่าเพิ่ม</span><span class="tabular-nums">{{ baht(order.tax) }}</span></div>
    </div>

    <div class="mx-6 mt-2 flex items-baseline justify-between border-y-2 border-ink py-2.5">
      <span class="text-sm font-bold">ยอดสุทธิ</span>
      <span class="text-2xl font-extrabold tabular-nums">฿{{ baht(order.total) }}</span>
    </div>

    <!-- payment -->
    <div class="mx-6 mt-3 space-y-0.5 text-xs">
      <div class="flex justify-between"><span class="text-text-muted">ชำระโดย</span><span class="font-semibold">{{ order.paymentMethod ? methodLabel[order.paymentMethod] : '-' }}</span></div>
      <template v-if="order.paymentMethod === 'cash' && received !== undefined">
        <div class="flex justify-between"><span class="text-text-muted">รับเงิน</span><span class="tabular-nums">{{ baht(received) }}</span></div>
        <div class="flex justify-between"><span class="text-text-muted">เงินทอน</span><span class="tabular-nums">{{ baht(change ?? 0) }}</span></div>
      </template>
    </div>

    <div v-if="order.pointsRedeemed > 0 || order.pointsEarned > 0" class="mx-6 mt-3 space-y-0.5 border-t border-dashed border-ink-soft/50 pt-2 text-xs">
      <div v-if="order.pointsRedeemed > 0" class="flex justify-between"><span class="text-text-muted">ใช้แต้ม</span><span class="tabular-nums">{{ order.pointsRedeemed }} แต้ม</span></div>
      <div v-if="order.pointsEarned > 0" class="flex justify-between"><span class="text-text-muted">แต้มที่ได้รับ</span><span class="font-semibold tabular-nums">+{{ order.pointsEarned }} แต้ม</span></div>
    </div>

    <!-- footer -->
    <div class="px-6 pb-9 pt-5 text-center">
      <p class="text-sm font-semibold">{{ shop?.receiptFooter || 'ขอบคุณที่ใช้บริการ' }}</p>
      <p class="mt-0.5 text-[10px] tracking-widest text-text-muted">THANK YOU</p>
    </div>
  </div>
</template>

<style>
/* torn-paper bottom edge on screen only */
.receipt-paper {
  border-radius: 6px 6px 0 0;
  box-shadow: 0 10px 30px rgb(0 0 0 / 0.2);
  /* solid body + a row of triangles along the bottom edge */
  --mask:
    conic-gradient(from -45deg at bottom, #0000, #000 1deg 89deg, #0000 90deg) bottom / 14px 7px repeat-x,
    linear-gradient(#000 0 0) top / 100% calc(100% - 7px) no-repeat;
  -webkit-mask: var(--mask);
  mask: var(--mask);
  padding-bottom: 7px;
}
@media print {
  body * { visibility: hidden; }
  #receipt-print, #receipt-print * { visibility: visible; }
  #receipt-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; -webkit-mask: none; mask: none; }
}
</style>
