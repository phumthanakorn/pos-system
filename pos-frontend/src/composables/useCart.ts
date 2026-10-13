import { useCartStore, type CartItem } from '../store/modules/cartStore'

export function useCart() {
  const cartStore = useCartStore()

  function addToCart(item: CartItem) {
    cartStore.addItem(item)
  }

  function removeFromCart(productId: number) {
    cartStore.removeItem(productId)
  }

  return { cartStore, addToCart, removeFromCart }
}
