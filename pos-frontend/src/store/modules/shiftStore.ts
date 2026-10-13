import { defineStore } from 'pinia'
import { shiftService, type ShiftView } from '../../api/services/shiftService'

export const useShiftStore = defineStore('shift', {
  state: () => ({
    shift: null as ShiftView | null,
    loaded: false,
  }),
  getters: {
    isOpen: (state) => state.shift !== null,
  },
  actions: {
    async load() {
      const { data } = await shiftService.getCurrent()
      this.shift = data.data
      this.loaded = true
    },
    async open(openingCash: number) {
      const { data } = await shiftService.open(openingCash)
      this.shift = data.data
    },
    async addCashMovement(type: 'in' | 'out', amount: number, reason: string) {
      const { data } = await shiftService.addCashMovement(type, amount, reason)
      this.shift = data.data
    },
    async close(closingCash: number) {
      const { data } = await shiftService.close(closingCash)
      this.shift = null
      return data.data
    },
  },
})
