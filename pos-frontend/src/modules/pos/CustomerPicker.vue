<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { toast } from 'vue-sonner'
import { Search, UserPlus, X } from '@lucide/vue'
import { customerService, type Customer } from '../../api/services/customerService'
import { errorMessage } from '../../store/modules/productStore'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; pick: [customer: Customer] }>()

const search = ref('')
const results = ref<Customer[]>([])
const loading = ref(false)
const creating = ref(false)
const newName = ref('')
const newPhone = ref('')
const saving = ref(false)
let requestId = 0

async function load() {
  const mine = (requestId += 1)
  loading.value = true
  try {
    const { data } = await customerService.list({ page: 1, pageSize: 8, search: search.value.trim() })
    if (mine === requestId) results.value = data.data.items
  } catch (error: unknown) {
    if (mine === requestId) toast.error(errorMessage(error, 'ค้นหาลูกค้าไม่สำเร็จ'))
  } finally {
    if (mine === requestId) loading.value = false
  }
}
const debouncedLoad = useDebounceFn(load, 250)

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return
    search.value = ''
    creating.value = false
    newName.value = ''
    newPhone.value = ''
    void load()
  },
)
watch(search, () => void debouncedLoad())

async function createCustomer() {
  if (!newName.value.trim()) {
    toast.error('กรุณาใส่ชื่อลูกค้า')
    return
  }
  saving.value = true
  try {
    const { data } = await customerService.create({ name: newName.value.trim(), phone: newPhone.value.trim(), note: '' })
    emit('pick', data.data)
  } catch (error: unknown) {
    toast.error(errorMessage(error, 'เพิ่มลูกค้าไม่สำเร็จ'))
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-4">
    <div class="w-full max-w-md rounded-3xl bg-surface p-6 shadow-xl">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold text-text">{{ creating ? 'เพิ่มสมาชิกใหม่' : 'เลือกสมาชิก' }}</h2>
        <button class="text-text-muted hover:text-text" @click="emit('close')"><X :size="20" /></button>
      </div>

      <template v-if="!creating">
        <div class="relative mb-3">
          <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input v-model="search" type="text" placeholder="ค้นหาด้วยชื่อหรือเบอร์โทร" class="w-full rounded-xl border border-border py-2.5 pl-9 pr-3 text-sm outline-none focus:border-primary" />
        </div>
        <ul class="max-h-72 space-y-1 overflow-y-auto">
          <li v-for="c in results" :key="c.id">
            <button class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left hover:bg-bg" @click="emit('pick', c)">
              <span>
                <span class="block text-sm font-semibold text-text">{{ c.name }}</span>
                <span class="block text-xs text-text-muted">{{ c.phone || 'ไม่มีเบอร์โทร' }}</span>
              </span>
              <span class="text-sm font-semibold text-primary">{{ c.points.toLocaleString('th-TH') }} แต้ม</span>
            </button>
          </li>
          <li v-if="!loading && !results.length" class="py-6 text-center text-sm text-text-muted">ไม่พบสมาชิก</li>
        </ul>
        <button class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-ink-soft hover:border-primary" @click="creating = true">
          <UserPlus :size="16" /> เพิ่มสมาชิกใหม่
        </button>
      </template>

      <form v-else class="space-y-3" @submit.prevent="createCustomer">
        <input v-model="newName" type="text" placeholder="ชื่อ *" class="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <input v-model="newPhone" type="tel" inputmode="tel" placeholder="เบอร์โทร" class="w-full rounded-xl border border-border px-3 py-2.5 text-sm outline-none focus:border-primary" />
        <div class="flex gap-2">
          <button type="button" class="flex-1 rounded-xl border border-border py-2.5 text-sm text-ink-soft" @click="creating = false">กลับ</button>
          <button type="submit" class="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-50" :disabled="saving">บันทึกและเลือก</button>
        </div>
      </form>
    </div>
  </div>
</template>
