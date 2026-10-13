import { apiClient } from '../client'

export const codeService = {
  async generate(kind: 'sku' | 'barcode'): Promise<string> {
    const { data } = await apiClient.get<{ data: { value: string } }>('/codes/generate', { params: { kind } })
    return data.data.value
  },
}
