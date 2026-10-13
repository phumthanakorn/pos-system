export interface LoyaltyConfig {
  enabled: boolean;
  // spend this many baht to earn 1 point
  bahtPerPoint: number;
  // this many points are worth 1 baht of discount
  pointsPerBaht: number;
}

export const DEFAULT_LOYALTY: LoyaltyConfig = { enabled: false, bahtPerPoint: 25, pointsPerBaht: 10 };

export function parseLoyalty(raw: string | undefined): LoyaltyConfig {
  if (!raw) return { ...DEFAULT_LOYALTY };
  try {
    const parsed = JSON.parse(raw) as Partial<LoyaltyConfig>;
    const config = { ...DEFAULT_LOYALTY, ...parsed };
    if (!(config.bahtPerPoint > 0)) config.bahtPerPoint = DEFAULT_LOYALTY.bahtPerPoint;
    if (!(config.pointsPerBaht > 0)) config.pointsPerBaht = DEFAULT_LOYALTY.pointsPerBaht;
    return config;
  } catch {
    return { ...DEFAULT_LOYALTY };
  }
}

// Whole points only, rounded down: 100 baht at 25 baht/point = 4 points, 99 baht = 3.
export function pointsEarned(total: number, config: LoyaltyConfig): number {
  if (!config.enabled || total <= 0) return 0;
  return Math.floor(total / config.bahtPerPoint);
}

// Baht discount for a number of points, to the satang.
export function pointsValue(points: number, config: LoyaltyConfig): number {
  if (points <= 0) return 0;
  return Math.round((points / config.pointsPerBaht) * 100) / 100;
}

// The most points that can be spent: limited by balance and by the amount left to discount.
export function maxRedeemablePoints(balance: number, discountable: number, config: LoyaltyConfig): number {
  if (!config.enabled || balance <= 0 || discountable <= 0) return 0;
  const byAmount = Math.floor(Math.round(discountable * config.pointsPerBaht * 100) / 100);
  return Math.max(Math.min(balance, byAmount), 0);
}
