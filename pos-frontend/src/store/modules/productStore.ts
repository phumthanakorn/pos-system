import { defineStore } from 'pinia'
import { productService, type ProductInput } from '../../api/services/productService'

export interface Category {
  id: number
  name: string
  productCount?: number
}

export interface Product {
  id: number
  name: string
  price: number
  categoryId: number | null
  barcode: string
  unit: string
  isActive: boolean
  sku: string
  description: string
  imageUrl: string | null
  cost: number | null
  stockQty: number
  minStock: number
  trackStock: boolean
}

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export function imageSrc(imageUrl: string | null): string | null {
  return imageUrl ? `${API_BASE_URL}${imageUrl}` : null
}

export function errorMessage(error: unknown, fallback: string): string {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  if (typeof message === 'string') return message
  if (Array.isArray(message)) return message.join(', ') || fallback
  // Nest nests validation errors one level deeper: { message: string | string[] }
  const inner = (message as { message?: unknown } | undefined)?.message
  if (typeof inner === 'string') return inner
  if (Array.isArray(inner)) return inner.join(', ') || fallback
  return fallback
}

export const useProductStore = defineStore('product', {
  state: () => ({
    categories: [] as Category[],
    products: [] as Product[],
  }),
  getters: {
    activeProducts: (state) => state.products.filter((p) => p.isActive),
    categoryName: (state) => (categoryId: number | null) =>
      state.categories.find((c) => c.id === categoryId)?.name ?? '-',
  },
  actions: {
    async load() {
      const [categories, products] = await Promise.all([
        productService.listCategories(),
        productService.listSellable(),
      ])
      this.categories = categories.data.data
      this.products = products.data.data
    },
    async addProduct(data: ProductInput): Promise<Product> {
      const { data: res } = await productService.createProduct(data)
      this.products.push(res.data)
      return res.data
    },
    async updateProduct(id: number, data: Partial<ProductInput>) {
      const { data: res } = await productService.updateProduct(id, data)
      const index = this.products.findIndex((p) => p.id === id)
      if (index !== -1) this.products[index] = res.data
    },
    async deleteProduct(id: number) {
      await productService.deleteProduct(id)
      this.products = this.products.filter((p) => p.id !== id)
    },
    async uploadImage(id: number, file: File) {
      const { data: res } = await productService.uploadProductImage(id, file)
      const index = this.products.findIndex((p) => p.id === id)
      if (index !== -1) this.products[index] = res.data
    },
    async removeImage(id: number) {
      const { data: res } = await productService.deleteProductImage(id)
      const index = this.products.findIndex((p) => p.id === id)
      if (index !== -1) this.products[index] = res.data
    },
    async toggleProductActive(id: number) {
      const product = this.products.find((p) => p.id === id)
      if (!product) return
      await this.updateProduct(id, { isActive: !product.isActive })
    },
    async addCategory(name: string) {
      const { data: res } = await productService.createCategory(name)
      this.categories.push(res.data)
    },
    async updateCategory(id: number, name: string) {
      const { data: res } = await productService.updateCategory(id, name)
      const index = this.categories.findIndex((c) => c.id === id)
      if (index !== -1) this.categories[index] = res.data
    },
    async deleteCategory(id: number) {
      await productService.deleteCategory(id)
      this.categories = this.categories.filter((c) => c.id !== id)
    },
  },
})
