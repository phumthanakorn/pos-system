import { apiClient } from '../client'
import type { PageResult } from '../types'
import type { Category, Product } from '../../store/modules/productStore'

export interface ProductInput {
  name: string
  price: number
  categoryId: number | null
  barcode: string
  unit: string
  isActive: boolean
  sku: string
  description: string
  cost: number | null
  stockQty: number
  minStock: number
  trackStock: boolean
}

export const productService = {
  listSellable() {
    return apiClient.get('/products/sellable')
  },
  async listProductsPage(params: {
    page: number
    pageSize: number
    search?: string
    categoryId?: number | null
    status?: 'active' | 'inactive' | null
  }) {
    const { data } = await apiClient.get<{ data: PageResult<unknown> }>('/products', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        ...(params.search ? { search: params.search } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.status ? { status: params.status } : {}),
      },
    })
    return data.data
  },
  createProduct(payload: ProductInput) {
    return apiClient.post('/products', payload)
  },
  updateProduct(id: number, payload: Partial<ProductInput>) {
    return apiClient.patch(`/products/${id}`, payload)
  },
  deleteProduct(id: number) {
    return apiClient.delete(`/products/${id}`)
  },
  uploadProductImage(id: number, file: File) {
    const body = new FormData()
    body.append('image', file)
    return apiClient.post(`/products/${id}/image`, body)
  },
  deleteProductImage(id: number) {
    return apiClient.delete(`/products/${id}/image`)
  },
  listCategories() {
    return apiClient.get('/categories')
  },
  createCategory(name: string) {
    return apiClient.post('/categories', { name })
  },
  updateCategory(id: number, name: string) {
    return apiClient.patch(`/categories/${id}`, { name })
  },
  deleteCategory(id: number) {
    return apiClient.delete(`/categories/${id}`)
  },
  reorderCategories(ids: number[]) {
    return apiClient.patch<{ data: Category[] }>('/categories/reorder', { ids })
  },
  lowStock() {
    return apiClient.get<{ data: Product[] }>('/products/low-stock')
  },
  adjustStock(id: number, payload: { qty: number; type: 'purchase' | 'adjustment'; note: string }) {
    return apiClient.post<{ data: Product }>(`/products/${id}/stock-adjustments`, payload)
  },
  stockMovements(id: number, params: { page: number; pageSize: number }) {
    return apiClient.get<{ data: PageResult<StockMovement> }>(`/products/${id}/stock-movements`, { params })
  },
}

export interface StockMovement {
  id: number
  type: 'purchase' | 'sale' | 'adjustment'
  qty: number
  balanceAfter: number
  note: string | null
  createdByName: string | null
  createdAt: string
}

