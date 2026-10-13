export function useReceiptPrinter() {
  function print(_receiptHtml: string) {
    // เชื่อมกับ local print service (ESC/POS) ในขั้นต่อไป
    window.print()
  }

  return { print }
}
