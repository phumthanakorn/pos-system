import { Coffee, Cookie, Sandwich, Soup, IceCream, Candy, Pizza, Package } from '@lucide/vue'

const ICONS = [Coffee, Cookie, Sandwich, Soup, IceCream, Candy, Pizza, Package]

export function useProductIcon() {
  function iconForCategory(categoryId: number | null) {
    return ICONS[(categoryId ?? 0) % ICONS.length] ?? Package
  }

  return { iconForCategory }
}
