import { ForbiddenException } from '@nestjs/common';

export interface AuthenticatedUser {
  id: number;
  shopId: number | null;
  email: string;
  role: string;
}

export function requireShopId(user: AuthenticatedUser): number {
  if (user.shopId === null) {
    throw new ForbiddenException('ยังไม่ได้ตั้งค่าร้าน');
  }
  return user.shopId;
}
