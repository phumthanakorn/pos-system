import { apiClient } from '../client'
import type { PageResult } from '../types'

export interface IngredientView {
  id: number
  name: string
  categoryId: number | null
  categoryName: string | null
  sku: string
  barcode: string
  unit: string
  costPerUnit: number
  stockQty: number
  minStock: number
  isLowStock: boolean
  supplierName: string
  yieldPercent: number
  purchaseUnit: string
  purchaseQty: number | null
  purchasePrice: number | null
  note: string
  isActive: boolean
}

export interface IngredientInput {
  name: string
  categoryId: number | null
  sku: string
  barcode: string
  unit: string
  costPerUnit: number
  stockQty: number
  minStock: number
  supplierName: string
  yieldPercent: number
  purchaseUnit: string
  purchaseQty: number | null
  purchasePrice: number | null
  note: string
  isActive: boolean
}

export const inventoryService = {
  listCategories() {
    return apiClient.get<{ data: { id: number; name: string }[] }>('/inventory/categories')
  },
  createCategory(name: string) {
    return apiClient.post('/inventory/categories', { name })
  },
  updateCategory(id: number, name: string) {
    return apiClient.patch(`/inventory/categories/${id}`, { name })
  },
  removeCategory(id: number) {
    return apiClient.delete(`/inventory/categories/${id}`)
  },
  listIngredients(params: { page: number; pageSize: number; search?: string; categoryId?: number | null }) {
    return apiClient.get<{ data: PageResult<IngredientView> & { lowStockCount: number } }>('/inventory/ingredients', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        ...(params.search ? { search: params.search } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      },
    })
  },
  createIngredient(payload: IngredientInput) {
    return apiClient.post<{ data: IngredientView }>('/inventory/ingredients', payload)
  },
  updateIngredient(id: number, payload: Partial<IngredientInput>) {
    return apiClient.patch<{ data: IngredientView }>(`/inventory/ingredients/${id}`, payload)
  },
  removeIngredient(id: number) {
    return apiClient.delete(`/inventory/ingredients/${id}`)
  },
}
