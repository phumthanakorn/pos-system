import { apiClient } from '../client'

export interface ShopSettings {
  name: string
  type: 'restaurant' | 'retail' | 'cafe' | 'salon' | 'nail'
  hasDineIn: boolean
  phone: string
  address: string
  logoAbbr: string
  logoUrl: string | null
  taxId: string
  receiptFooter: string
  promptPayId: string
}

export interface TaxSettings {
  enabled: boolean
  name: string
  rate: number
  isInclusive: boolean
}

export interface ReceiptOptions {
  showLogo: boolean
  showAddress: boolean
  showPhone: boolean
  showTaxId: boolean
  showOrderNumber: boolean
  showUnitPrice: boolean
  paperWidth: 58 | 80
  headerNote: string
}

export interface LoyaltySettings {
  enabled: boolean
  bahtPerPoint: number
  pointsPerBaht: number
}

export interface SettingsView {
  shop: ShopSettings
  loyalty: LoyaltySettings
  receipt: ReceiptOptions
  tax: TaxSettings
}

export const settingsService = {
  get() {
    return apiClient.get<{ data: SettingsView }>('/settings')
  },
  updateShop(payload: Partial<ShopSettings>) {
    return apiClient.patch<{ data: SettingsView }>('/settings/shop', payload)
  },
  uploadLogo(file: File) {
    const body = new FormData()
    body.append('image', file)
    return apiClient.post<{ data: SettingsView }>('/settings/logo', body)
  },
  removeLogo() {
    return apiClient.delete<{ data: SettingsView }>('/settings/logo')
  },
  updateReceipt(payload: Partial<ReceiptOptions>) {
    return apiClient.patch<{ data: SettingsView }>('/settings/receipt', payload)
  },
  updateLoyalty(payload: Partial<LoyaltySettings>) {
    return apiClient.patch<{ data: SettingsView }>('/settings/loyalty', payload)
  },
  updateTax(payload: TaxSettings) {
    return apiClient.patch<{ data: SettingsView }>('/settings/tax', payload)
  },
}
