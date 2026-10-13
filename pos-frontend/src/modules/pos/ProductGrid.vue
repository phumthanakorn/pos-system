<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { toast } from 'vue-sonner'
import { UtensilsCrossed, Plus } from '@lucide/vue'
import { useAuthStore } from '../../store/modules/authStore'
import { useCartStore } from '../../store/modules/cartStore'
import { useProductStore, errorMessage, imageSrc, type Product } from '../../store/modules/productStore'
import { useProductIcon } from '../../composables/useProductIcon'

const productStore = useProductStore()
const cartStore = useCartStore()
const authStore = useAuthStore()
const { iconForCategory } = useProductIcon()

onMounted(() => {
  productStore.load().catch((error: unknown) => toast.error(errorMessage(error, 'โหลดเมนูไม่สำเร็จ')))
})

const activeCategoryId = ref<number | null>(null)

const filteredProducts = computed(() =>
  activeCategoryId.value === null
    ? productStore.activeProducts
    : productStore.activeProducts.filter((p) => p.categoryId === activeCategoryId.value),
)

function isTracked(product: Product) {
  return product.trackStock
}

function addToCart(product: Product) {
  // cashiers cannot sell past the counted stock; owner/manager can (the server asks them to confirm)
  if (isTracked(product) && qtyInCart(product.id) + 1 > product.stockQty && authStore.user?.role === 'cashier') {
    toast.error(product.stockQty > 0 ? `${product.name} เหลือ ${product.stockQty} ${product.unit}` : `${product.name} หมดแล้ว`)
    return
  }
  cartStore.addItem({ productId: product.id, name: product.name, price: product.price, qty: 1, discount: 0 })
}

function qtyInCart(id: number) {
  return cartStore.items.find((i) => i.productId === id)?.qty ?? 0
}
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="flex gap-2 overflow-x-auto px-6 pt-6 pb-2">
      <button
        class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition"
        :class="
          activeCategoryId === null ? 'bg-ink text-white' : 'bg-surface text-text-muted hover:text-text'
        "
        @click="activeCategoryId = null"
      >
        ทั้งหมด
      </button>
      <button
        v-for="cat in productStore.categories"
        :key="cat.id"
        class="shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition"
        :class="
          activeCategoryId === cat.id ? 'bg-ink text-white' : 'bg-surface text-text-muted hover:text-text'
        "
        @click="activeCategoryId = cat.id"
      >
        {{ cat.name }}
      </button>
    </div>

    <div
      v-if="filteredProducts.length"
      class="grid flex-1 grid-cols-[repeat(auto-fill,minmax(150px,1fr))] content-start gap-4 overflow-y-auto p-6 pt-4"
    >
      <div
        v-for="product in filteredProducts"
        :key="product.id"
        class="group relative flex flex-col overflow-hidden rounded-3xl bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-md"
        :class="isTracked(product) && product.stockQty <= 0 ? 'opacity-60' : ''"
      >
        <div class="flex aspect-square items-center justify-center overflow-hidden bg-primary-soft text-primary">
          <img v-if="product.imageUrl" :src="imageSrc(product.imageUrl) ?? ''" :alt="product.name" class="h-full w-full object-cover" />
          <component :is="iconForCategory(product.categoryId)" v-else class="h-10 w-10" :stroke-width="1.5" />
        </div>

        <button
          class="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white shadow transition active:scale-90"
          @click="addToCart(product)"
        >
          <Plus class="h-4 w-4" :stroke-width="2.5" />
        </button>

        <span
          v-if="qtyInCart(product.id)"
          class="absolute left-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-white"
        >
          {{ qtyInCart(product.id) }}
        </span>

        <div class="p-3">
          <p class="truncate text-sm font-semibold text-text">{{ product.name }}</p>
          <p class="text-sm font-bold text-text-muted">฿{{ product.price.toFixed(0) }}</p>
          <p v-if="isTracked(product)" class="mt-0.5 text-xs font-medium" :class="product.stockQty <= 0 ? 'text-danger' : product.stockQty <= product.minStock ? 'text-warning' : 'text-text-muted'">
            {{ product.stockQty <= 0 ? 'หมด' : `เหลือ ${product.stockQty}` }}
          </p>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-1 flex-col items-center justify-center gap-2 text-text-muted">
      <UtensilsCrossed class="h-10 w-10" :stroke-width="1.5" />
      <span class="text-sm">ยังไม่มีสินค้าในหมวดหมู่นี้</span>
    </div>
  </div>
</template>
