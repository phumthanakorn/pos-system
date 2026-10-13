export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export interface TaxConfig {
  rate: number;
  isInclusive: boolean;
}

export function calculateTotals(subtotal: number, discount: number, tax: TaxConfig | null) {
  const taxable = round2(Math.max(0, subtotal - discount));
  if (!tax || tax.rate <= 0) {
    return { subtotal, discount, tax: 0, total: taxable };
  }
  if (tax.isInclusive) {
    const vat = round2(taxable - taxable / (1 + tax.rate / 100));
    return { subtotal, discount, tax: vat, total: taxable };
  }
  const vat = round2(taxable * (tax.rate / 100));
  return { subtotal, discount, tax: vat, total: round2(taxable + vat) };
}

export interface DiscountRule {
  type: 'percent' | 'amount';
  value: number;
}

// Discount for a whole bill, never more than the subtotal and never negative.
export function calculateDiscount(subtotal: number, rule: DiscountRule | null): number {
  if (!rule || subtotal <= 0) return 0;
  const raw = rule.type === 'percent' ? subtotal * (Math.min(rule.value, 100) / 100) : rule.value;
  return round2(Math.min(Math.max(raw, 0), subtotal));
}

export interface DrawerFigures {
  openingCash: number;
  cashSales: number;
  cashIn: number;
  cashOut: number;
}

// Cash that should physically be in the drawer: opening + cash sales + money put in - money taken out.
export function expectedDrawerCash(f: DrawerFigures): number {
  return round2(f.openingCash + f.cashSales + f.cashIn - f.cashOut);
}
