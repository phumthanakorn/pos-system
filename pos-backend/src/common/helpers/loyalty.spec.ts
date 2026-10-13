import { describe, expect, it } from 'vitest';
import { maxRedeemablePoints, parseLoyalty, pointsEarned, pointsValue } from './loyalty.js';

const on = { enabled: true, bahtPerPoint: 25, pointsPerBaht: 10 };

describe('loyalty', () => {
  it('earns whole points rounded down', () => {
    expect(pointsEarned(100, on)).toBe(4);
    expect(pointsEarned(99.99, on)).toBe(3);
    expect(pointsEarned(24, on)).toBe(0);
  });
  it('earns nothing when disabled or total is zero', () => {
    expect(pointsEarned(500, { ...on, enabled: false })).toBe(0);
    expect(pointsEarned(0, on)).toBe(0);
  });
  it('converts points to baht', () => {
    expect(pointsValue(10, on)).toBe(1);
    expect(pointsValue(25, on)).toBe(2.5);
    expect(pointsValue(0, on)).toBe(0);
  });
  it('limits redemption by balance and by what is left to discount', () => {
    expect(maxRedeemablePoints(500, 30, on)).toBe(300);
    expect(maxRedeemablePoints(120, 30, on)).toBe(120);
    expect(maxRedeemablePoints(120, 0, on)).toBe(0);
    expect(maxRedeemablePoints(120, 30, { ...on, enabled: false })).toBe(0);
  });
  it('falls back to defaults on bad stored data', () => {
    expect(parseLoyalty('not json').enabled).toBe(false);
    expect(parseLoyalty(JSON.stringify({ enabled: true, bahtPerPoint: 0 })).bahtPerPoint).toBe(25);
    expect(parseLoyalty(undefined).pointsPerBaht).toBe(10);
  });
});
