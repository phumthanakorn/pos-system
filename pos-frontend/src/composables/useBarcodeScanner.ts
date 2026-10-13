import { onMounted, onUnmounted } from 'vue'

export function useBarcodeScanner(onScan: (barcode: string) => void) {
  let buffer = ''
  let lastKeyTime = 0

  function handleKeydown(event: KeyboardEvent) {
    const now = Date.now()
    if (now - lastKeyTime > 50) {
      buffer = ''
    }
    lastKeyTime = now

    if (event.key === 'Enter') {
      if (buffer.length > 0) {
        onScan(buffer)
        buffer = ''
      }
      return
    }

    if (event.key.length === 1) {
      buffer += event.key
    }
  }

  onMounted(() => window.addEventListener('keydown', handleKeydown))
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown))
}
