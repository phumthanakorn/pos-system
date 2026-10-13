import { describe, expect, it } from 'vitest';
import { calculateDiscount, calculateTotals, expectedDrawerCash, round2 } from './money.js';

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(1.005 + 0.0000001)).toBe(1.01);
    expect(round2(10)).toBe(10);
  });
});

describe('calculateTotals', () => {
  it('returns subtotal as total when there is no tax', () => {
    expect(calculateTotals(100, 0, null)).toEqual({ subtotal: 100, discount: 0, tax: 0, total: 100 });
  });

  it('ignores a 0% tax', () => {
    expect(calculateTotals(100, 0, { rate: 0, isInclusive: false }).total).toBe(100);
  });

  it('extracts VAT 7% from a VAT-inclusive price without changing the total', () => {
    expect(calculateTotals(107, 0, { rate: 7, isInclusive: true })).toEqual({
      subtotal: 107,
      discount: 0,
      tax: 7,
      total: 107,
    });
  });

  it('adds VAT 7% on top for VAT-exclusive prices', () => {
    expect(calculateTotals(100, 0, { rate: 7, isInclusive: false })).toEqual({
      subtotal: 100,
      discount: 0,
      tax: 7,
      total: 107,
    });
  });

  it('applies the discount before tax', () => {
    expect(calculateTotals(200, 100, { rate: 7, isInclusive: false })).toEqual({
      subtotal: 200,
      discount: 100,
      tax: 7,
      total: 107,
    });
  });

  it('never goes below zero when the discount exceeds the subtotal', () => {
    expect(calculateTotals(50, 80, { rate: 7, isInclusive: false }).total).toBe(0);
  });

  it('rounds VAT to satang precision', () => {
    const result = calculateTotals(65, 0, { rate: 7, isInclusive: true });
    expect(result.tax).toBe(4.25);
    expect(result.total).toBe(65);
  });
});

describe('calculateDiscount', () => {
  it('returns 0 without a rule or an empty bill', () => {
    expect(calculateDiscount(100, null)).toBe(0);
    expect(calculateDiscount(0, { type: 'percent', value: 10 })).toBe(0);
  });

  it('applies a percentage and rounds to satang', () => {
    expect(calculateDiscount(100, { type: 'percent', value: 10 })).toBe(10);
    expect(calculateDiscount(33.33, { type: 'percent', value: 15 })).toBe(5);
  });

  it('applies a fixed amount', () => {
    expect(calculateDiscount(100, { type: 'amount', value: 25 })).toBe(25);
  });

  it('never exceeds the subtotal, even for >100% or an oversized amount', () => {
    expect(calculateDiscount(100, { type: 'percent', value: 150 })).toBe(100);
    expect(calculateDiscount(50, { type: 'amount', value: 80 })).toBe(50);
  });

  it('feeds correctly into calculateTotals (discount before VAT)', () => {
    const discount = calculateDiscount(200, { type: 'percent', value: 50 });
    expect(calculateTotals(200, discount, { rate: 7, isInclusive: false })).toEqual({
      subtotal: 200,
      discount: 100,
      tax: 7,
      total: 107,
    });
  });
});

describe('expectedDrawerCash', () => {
  it('adds cash sales and cash-in, subtracts cash-out', () => {
    expect(expectedDrawerCash({ openingCash: 1000, cashSales: 750, cashIn: 200, cashOut: 150 })).toBe(1800);
  });

  it('equals the opening cash when nothing happened', () => {
    expect(expectedDrawerCash({ openingCash: 1000, cashSales: 0, cashIn: 0, cashOut: 0 })).toBe(1000);
  });

  it('avoids floating point drift', () => {
    expect(expectedDrawerCash({ openingCash: 0.1, cashSales: 0.2, cashIn: 0, cashOut: 0 })).toBe(0.3);
  });
});
